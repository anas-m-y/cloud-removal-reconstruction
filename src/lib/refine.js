// Optional clean-up after the model. Everything here works in linear reflectance (0-1), the same space the model sees.
//   1. passes: run the model on flipped / rotated copies of the input and average the results (test-time augmentation).
//   2. estimateMask: guess where the cloud was from where the model changed the picture a lot (no cloud mask is needed from the user).
//   3. matchColour: inside that mask, move the generated colour toward the colour of the clear pixels around it.
//   4. keepClear: outside that mask, put the original pixels back.
// The settings (threshold 0.04, dilation 4 px, blur 24 px) were tuned on half of the held-out composite test and scored on the other half.
import { N } from './img.js';

const NN = N * N;

// ---------------------------------------------------------------- Gaussian blur (same as scipy.ndimage.gaussian_filter, mode 'reflect')
const kernels = new Map();
function kernel(sigma) {
  if (!kernels.has(sigma)) {
    const r = Math.floor(4 * sigma + 0.5), w = new Float64Array(2 * r + 1); let s = 0;
    for (let i = -r; i <= r; i++) { w[i + r] = Math.exp((-0.5 * i * i) / (sigma * sigma)); s += w[i + r]; }
    for (let i = 0; i < w.length; i++) w[i] /= s;
    kernels.set(sigma, { w, r });
  }
  return kernels.get(sigma);
}
const reflect = (j) => { while (j < 0 || j >= N) j = j < 0 ? -j - 1 : 2 * N - j - 1; return j; };

function rowPass(src, dst, w, r) {
  const pad = new Float32Array(N + 2 * r), taps = 2 * r + 1;
  for (let y = 0; y < N; y++) {
    const o = y * N;
    for (let i = 0; i < pad.length; i++) pad[i] = src[o + reflect(i - r)];
    for (let x = 0; x < N; x++) { let s = 0; for (let k = 0; k < taps; k++) s += w[k] * pad[x + k]; dst[o + x] = s; }
  }
}
function transpose(src, dst) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) dst[x * N + y] = src[y * N + x]; }

/** Blur one N x N plane. Returns a new Float32Array. */
export function blur(plane, sigma) {
  const { w, r } = kernel(sigma), a = new Float32Array(NN), b = new Float32Array(NN);
  rowPass(plane, a, w, r); transpose(a, b); rowPass(b, a, w, r); transpose(a, b);
  return b;
}

// ---------------------------------------------------------------- flip / rotate averaging
/** Rotate each N x N plane counter-clockwise by k quarter turns (numpy.rot90). */
function rotate(src, planes, k) {
  k = ((k % 4) + 4) % 4; if (k === 0) return src;
  const out = new Float32Array(src.length);
  for (let c = 0; c < planes; c++) {
    const o = c * NN;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const s = k === 1 ? j * N + (N - 1 - i) : k === 2 ? (N - 1 - i) * N + (N - 1 - j) : (N - 1 - j) * N + i;
      out[o + i * N + j] = src[o + s];
    }
  }
  return out;
}
function flip(src, planes) {
  const out = new Float32Array(src.length);
  for (let c = 0; c < planes; c++) { const o = c * NN; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) out[o + i * N + j] = src[o + i * N + (N - 1 - j)]; }
  return out;
}
export const forwardTF = (x, planes, k, fl) => { const r = rotate(x, planes, k); return fl ? flip(r, planes) : r; };
export const inverseTF = (y, planes, k, fl) => rotate(fl ? flip(y, planes) : y, planes, 4 - k);

/** The (quarter turns, flip) pairs for each quality level. 4 passes = the four flips, 8 passes = all rotations too. */
export const TRANSFORMS = {
  1: [[0, 0]],
  4: [[0, 0], [0, 1], [2, 0], [2, 1]],
  8: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1]],
};

// ---------------------------------------------------------------- estimated cloud mask
/** inLin, outLin: Float32Array(3 * N * N) in linear reflectance. Returns Uint8Array(N * N), 1 where cloud is estimated. */
export function estimateMask(inLin, outLin, { threshold = 0.04, dilation = 4 } = {}) {
  const d = new Float32Array(NN);
  for (let i = 0; i < NN; i++) d[i] = (Math.abs(outLin[i] - inLin[i]) + Math.abs(outLin[NN + i] - inLin[NN + i]) + Math.abs(outLin[2 * NN + i] - inLin[2 * NN + i])) / 3;
  const score = blur(d, 2), bin = new Uint8Array(NN);
  for (let i = 0; i < NN; i++) bin[i] = score[i] > threshold ? 1 : 0;
  // 5 x 5 median of a 0/1 image = "at least 13 of the 25 neighbours are 1" (reflected borders)
  const med = new Uint8Array(NN);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let c = 0;
    for (let dy = -2; dy <= 2; dy++) { const yy = reflect(y + dy) * N; for (let dx = -2; dx <= 2; dx++) c += bin[yy + reflect(x + dx)]; }
    med[y * N + x] = c >= 13 ? 1 : 0;
  }
  // dilation with a plus-shaped element, repeated `dilation` times (zero outside the image)
  let cur = med;
  for (let it = 0; it < dilation; it++) {
    const nxt = new Uint8Array(cur);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (cur[i]) continue;
      if ((y > 0 && cur[i - N]) || (y < N - 1 && cur[i + N]) || (x > 0 && cur[i - 1]) || (x < N - 1 && cur[i + 1])) nxt[i] = 1;
    }
    cur = nxt;
  }
  return cur;
}

// ---------------------------------------------------------------- colour matching and pixel restore
/** Shift the generated colour inside the mask toward the colour of the clear pixels around it. alpha 0 = off, 1 = full. */
export function matchColour(outLin, inLin, mask, alpha = 0.75, sigma = 24) {
  let nClear = 0, nCloud = 0;
  for (let i = 0; i < NN; i++) { if (mask[i]) nCloud++; else nClear++; }
  if (alpha === 0 || nCloud === 0 || nClear < 50) return outLin;
  const w = new Float32Array(NN), m = new Float32Array(NN);
  for (let i = 0; i < NN; i++) { w[i] = mask[i] ? 0 : 1; m[i] = mask[i] ? 1 : 0; }
  const den = blur(w, sigma), ms = blur(m, 3), res = new Float32Array(outLin.length);
  for (let c = 0; c < 3; c++) {
    const o = c * NN, tmp = new Float32Array(NN);
    let glob = 0; for (let i = 0; i < NN; i++) { tmp[i] = inLin[o + i] * w[i]; glob += tmp[i]; }
    glob /= nClear;
    const num = blur(tmp, sigma), low = blur(outLin.subarray(o, o + NN), sigma);
    for (let i = 0; i < NN; i++) {
      const target = (num[i] + 0.02 * glob) / (den[i] + 0.02);
      res[o + i] = Math.min(1, Math.max(0, outLin[o + i] + alpha * (target - low[i]) * ms[i]));
    }
  }
  return res;
}

/** Outside the mask, put the original pixels back. */
export function keepClear(outLin, inLin, mask) {
  const res = new Float32Array(outLin);
  for (let i = 0; i < NN; i++) if (!mask[i]) { res[i] = inLin[i]; res[NN + i] = inLin[NN + i]; res[2 * NN + i] = inLin[2 * NN + i]; }
  return res;
}

/** Linear reflectance (3 planes) -> RGBA display pixels (sqrt encoding, as in the PNGs). */
export function toDisplay(lin) {
  const px = new Uint8ClampedArray(4 * NN);
  for (let i = 0, p = 0; i < NN; i++, p += 4) {
    for (let c = 0; c < 3; c++) px[p + c] = Math.round(Math.sqrt(Math.min(1, Math.max(0, lin[c * NN + i]))) * 255);
    px[p + 3] = 255;
  }
  return px;
}

/** Estimated mask as RGBA display pixels (white = cloud) for the overlay. */
export function maskToPixels(mask) {
  const px = new Uint8ClampedArray(4 * NN);
  for (let i = 0, p = 0; i < NN; i++, p += 4) { px[p] = px[p + 1] = px[p + 2] = mask[i] ? 255 : 0; px[p + 3] = 255; }
  return px;
}
