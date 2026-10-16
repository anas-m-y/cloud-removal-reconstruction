// CLOUDLESS v6 in the browser: ONNX Runtime Web, WebGPU when available, otherwise WebAssembly.
import * as ort from 'onnxruntime-web/webgpu';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import { N, toLinear } from './img.js';

const MODEL_URL = `${import.meta.env.BASE_URL}data/cloudless_v6.onnx`;
// Point ORT at its own loader script, so its worker threads do not re-run the app bundle.
ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl };
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;

let sessionPromise = null;
let backend = null;
const listeners = new Set();
let state = { phase: 'idle', loaded: 0, total: 0 };
const set = (s) => { state = { ...state, ...s }; listeners.forEach((f) => f(state)); };
export const modelState = () => state;
export const onModelState = (f) => { listeners.add(f); return () => listeners.delete(f); };

async function download() {
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`The model file is missing (${res.status}). Put cloudless_v6.onnx in public/data.`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader(); const parts = []; let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    parts.push(value); loaded += value.length; set({ phase: 'downloading', loaded, total });
  }
  const buf = new Uint8Array(loaded); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
  return buf;
}

export function loadModel() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      set({ phase: 'downloading', loaded: 0, total: 0 });
      const bytes = await download();
      set({ phase: 'compiling' });
      const adapter = 'gpu' in navigator ? await navigator.gpu.requestAdapter().catch(() => null) : null;
      const tries = adapter ? [['webgpu'], ['wasm']] : [['wasm']];
      let lastErr;
      for (const eps of tries) {
        try {
          const s = await ort.InferenceSession.create(bytes, { executionProviders: eps, graphOptimizationLevel: 'all' });
          backend = eps[0] === 'webgpu' ? 'WebGPU' : `WebAssembly, ${ort.env.wasm.numThreads} thread${ort.env.wasm.numThreads > 1 ? 's' : ''}`;
          set({ phase: 'ready', backend });
          return s;
        } catch (e) { lastErr = e; }
      }
      throw lastErr;
    })().catch((e) => { sessionPromise = null; set({ phase: 'error', error: String(e.message || e) }); throw e; });
  }
  return sessionPromise;
}

/**
 * opticalPx: RGBA display pixels (N x N). sarPx: RGBA of sar_raw.png (R = VV, G = VH packed over sarRange dB) or null.
 * sensor: 0 Sentinel-2, 1 Landsat. Returns { px: RGBA display pixels, ms, backend }.
 */
export async function reconstruct(opticalPx, sarPx, sensor, sarRange = [-35, 5]) {
  const session = await loadModel();
  const x = new Float32Array(5 * N * N);
  const lin = toLinear(opticalPx);
  for (let i = 0; i < 3 * N * N; i++) x[i] = lin[i] * 2 - 1;
  if (sarPx) {
    const [lo, hi] = sarRange;
    for (let i = 0, p = 0; i < N * N; i++, p += 4) {
      const vv = (sarPx[p] / 255) * (hi - lo) + lo, vh = (sarPx[p + 1] / 255) * (hi - lo) + lo;
      x[3 * N * N + i] = (vv / -25) * 2 - 1; x[4 * N * N + i] = (vh / -25) * 2 - 1;
    }
  }
  const feeds = {
    x: new ort.Tensor('float32', x, [1, 5, N, N]),
    sensor: new ort.Tensor('int64', BigInt64Array.from([BigInt(sensor)]), [1]),
    sar_present: new ort.Tensor('int64', BigInt64Array.from([sarPx ? 1n : 0n]), [1]),
  };
  const t0 = performance.now();
  const out = await session.run(feeds);
  const ms = performance.now() - t0;
  const y = out.y.data; const px = new Uint8ClampedArray(4 * N * N);
  for (let i = 0, p = 0; i < N * N; i++, p += 4) {
    for (let c = 0; c < 3; c++) { const v = Math.min(1, Math.max(0, y[c * N * N + i] * 0.5 + 0.5)); px[p + c] = Math.round(Math.sqrt(v) * 255); }
    px[p + 3] = 255;
  }
  return { px, ms, backend };
}
