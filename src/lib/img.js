// Pixel helpers. All images are 8-bit PNGs in display space: pixel = 255 * sqrt(reflectance / 6500).
export const N = 256;

const cache = new Map();
export function loadPixels(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(pixelsFromImage(img, false));
      img.onerror = () => { cache.delete(url); reject(new Error(`Could not load ${url}`)); };
      img.src = url;
    }));
  }
  return cache.get(url);
}

// Draw any image into an N x N canvas. cover=true crops the centre square of a non-square upload.
export function pixelsFromImage(img, cover = true) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  if (cover) {
    const s = Math.min(w, h);
    ctx.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, N, N);
  } else ctx.drawImage(img, 0, 0, N, N);
  return ctx.getImageData(0, 0, N, N).data;
}

export function pixelsToURL(px) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px), N, N), 0, 0);
  return c.toDataURL('image/png');
}

// Display value (0-255) -> linear reflectance fraction (0-1), as in training.
const LIN = new Float32Array(256).map((_, i) => (i / 255) ** 2);
export const toLinear = (px) => {
  const out = new Float32Array(3 * N * N);
  for (let i = 0, p = 0; i < N * N; i++, p += 4) { out[i] = LIN[px[p]]; out[N * N + i] = LIN[px[p + 1]]; out[2 * N * N + i] = LIN[px[p + 2]]; }
  return out;
};

// Keep the original pixels outside the cloud mask ("mask paste").
export function paste(outPx, inPx, maskPx) {
  const o = new Uint8ClampedArray(outPx);
  for (let p = 0; p < o.length; p += 4) if (maskPx[p] < 128) { o[p] = inPx[p]; o[p + 1] = inPx[p + 1]; o[p + 2] = inPx[p + 2]; }
  return o;
}

export function psnr(aPx, tPx) {
  const a = toLinear(aPx), t = toLinear(tPx); let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - t[i]; s += d * d; }
  return 10 * Math.log10(1 / Math.max(s / a.length, 1e-10));
}

// SSIM with a 7x7 uniform window per channel, averaged (matches scikit-image defaults closely).
export function ssim(aPx, tPx) {
  const A = toLinear(aPx), T = toLinear(tPx), C1 = 0.0001, C2 = 0.0009, w = 7, np = w * w, cov = np / (np - 1);
  let total = 0, count = 0;
  for (let ch = 0; ch < 3; ch++) {
    const o = ch * N * N;
    const integ = (f) => {
      const I = new Float64Array((N + 1) * (N + 1));
      for (let y = 0; y < N; y++) { let row = 0; for (let x = 0; x < N; x++) { row += f(o + y * N + x); I[(y + 1) * (N + 1) + x + 1] = I[y * (N + 1) + x + 1] + row; } }
      return I;
    };
    const Ia = integ((i) => A[i]), It = integ((i) => T[i]), Iaa = integ((i) => A[i] * A[i]), Itt = integ((i) => T[i] * T[i]), Iat = integ((i) => A[i] * T[i]);
    const box = (I, x, y) => I[(y + w) * (N + 1) + x + w] - I[y * (N + 1) + x + w] - I[(y + w) * (N + 1) + x] + I[y * (N + 1) + x];
    for (let y = 0; y <= N - w; y++) for (let x = 0; x <= N - w; x++) {
      const ma = box(Ia, x, y) / np, mt = box(It, x, y) / np;
      const va = cov * (box(Iaa, x, y) / np - ma * ma), vt = cov * (box(Itt, x, y) / np - mt * mt), vat = cov * (box(Iat, x, y) / np - ma * mt);
      total += ((2 * ma * mt + C1) * (2 * vat + C2)) / ((ma * ma + mt * mt + C1) * (va + vt + C2)); count++;
    }
  }
  return total / count;
}

export function meanAbsDiff(aPx, bPx) {
  let s = 0; for (let p = 0; p < aPx.length; p += 4) s += Math.abs(aPx[p] - bPx[p]) + Math.abs(aPx[p + 1] - bPx[p + 1]) + Math.abs(aPx[p + 2] - bPx[p + 2]);
  return s / (3 * N * N);
}
