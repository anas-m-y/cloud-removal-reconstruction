import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

// Liquid glass, ported from dashersw/liquid-glass-js to React.
// The original samples a static html2canvas snapshot of the page in WebGL, which cannot see the
// live ShaderGradient canvas behind our buttons. Here the same edge model (shape normal from a
// rounded-rect / pill distance field, exponential edge + rim falloff, a faint perpendicular ripple)
// is baked into a displacement map and applied to the live backdrop with an SVG filter.
// Chromium renders the refraction; Safari and Firefox fall back to frosted blur with the same rim.

const chromium = typeof navigator !== 'undefined' && /Chrom(e|ium)\//.test(navigator.userAgent);
const EDGE = 0.55, RIM = 0.45, EDGE_DIST = 0.16, RIM_DIST = 0.055, RIPPLE = 0.06;

// Signed distance to a rounded rectangle (negative inside), in pixels, plus its outward normal.
function sdf(px, py, w, h, r) {
  const cx = w / 2, cy = h / 2;
  const qx = Math.abs(px - cx) - (cx - r), qy = Math.abs(py - cy) - (cy - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  const d = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
  let nx, ny;
  if (qx > 0 && qy > 0) { const l = Math.hypot(ox, oy) || 1; nx = ox / l; ny = oy / l; }
  else if (qx > qy) { nx = 1; ny = 0; } else { nx = 0; ny = 1; }
  return [d, nx * Math.sign(px - cx || 1), ny * Math.sign(py - cy || 1)];
}

const cache = new Map();
function displacementMap(w, h, r) {
  const key = `${w}x${h}r${r}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'), img = ctx.createImageData(w, h), a = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [d, nx, ny] = sdf(x + 0.5, y + 0.5, w, h, r);
    const inside = Math.max(-d, 0);
    const k = EDGE * Math.exp(-inside * EDGE_DIST) + RIM * Math.exp(-inside * RIM_DIST);
    const rip = Math.sin(inside * 0.9) * RIPPLE * Math.exp(-inside * RIM_DIST);
    const dx = -nx * k - ny * rip, dy = -ny * k + nx * rip;           // sample inward: the rim magnifies what is behind it
    const i = (y * w + x) * 4;
    a[i] = 128 + dx * 127; a[i + 1] = 128 + dy * 127; a[i + 2] = 128; a[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

// Measures the element and returns an SVG filter that refracts its backdrop.
export function useLiquidGlass(ref, { strength = 22, blur = 3 } = {}) {
  const id = `lg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el || !chromium) return undefined;
    const measure = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
      if (w > 0 && h > 0) setSize((s) => (s && s.w === w && s.h === h && s.r === r ? s : { w, h, r }));
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.setProperty('--lg-filter', size ? `url(#${id}) blur(${blur}px) saturate(1.7) brightness(1.08)` : '');
  }, [size, id, blur, ref]);
  if (!size) return null;
  const { w, h, r } = size;
  return (
    <svg className="lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <filter id={id} x="0" y="0" width={w} height={h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feImage href={displacementMap(w, h, Math.round(r))} x="0" y="0" width={w} height={h} result="map" preserveAspectRatio="none" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale={strength} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

// Pointer-tracked specular highlight, the "light catching the glass" part of the effect.
function onMove(e) {
  const el = e.currentTarget, b = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${((e.clientX - b.left) / b.width) * 100}%`);
  el.style.setProperty('--my', `${((e.clientY - b.top) / b.height) * 100}%`);
}

export const GlassButton = forwardRef(function GlassButton({ variant, className = '', children, strength, ...rest }, fwd) {
  const ref = useRef(null);
  const defs = useLiquidGlass(ref, { strength: strength ?? (variant === 'primary' ? 18 : 24) });
  return (
    <button
      ref={(n) => { ref.current = n; if (typeof fwd === 'function') fwd(n); else if (fwd) fwd.current = n; }}
      className={`btn glass${variant ? ` ${variant}` : ''}${className ? ` ${className}` : ''}`}
      onPointerMove={onMove}
      {...rest}
    >
      {defs}
      <span className="glass-label">{children}</span>
    </button>
  );
});

// Generic glass surface (nav bar, panels that should refract).
export function GlassSurface({ className = '', strength = 30, blur = 10, children, ...rest }) {
  const ref = useRef(null);
  const defs = useLiquidGlass(ref, { strength, blur });
  return (
    <div ref={ref} className={`glass ${className}`} onPointerMove={onMove} {...rest}>
      {defs}
      {children}
    </div>
  );
}
