import { useCallback, useRef, useState } from 'react';

// Before/after viewer. Drag, click, or use the arrow keys to move the divider.
export default function Compare({ left, right, leftLabel, rightLabel, overlay, overlayKind, label = 'Comparison divider' }) {
  const [pos, setPos] = useState(50);
  const box = useRef(null), dragging = useRef(false);
  const move = useCallback((clientX) => {
    const r = box.current.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);
  const onKey = (e) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') { setPos((p) => Math.max(0, p - step)); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setPos((p) => Math.min(100, p + step)); e.preventDefault(); }
    if (e.key === 'Home') setPos(0); if (e.key === 'End') setPos(100);
  };
  return (
    <div
      ref={box} className="compare" style={{ '--pos': `${pos}%` }} tabIndex={0} role="slider"
      aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)} aria-valuetext={`${Math.round(pos)}% ${leftLabel}`}
      onKeyDown={onKey}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      {right && <img src={right} alt={rightLabel} draggable={false} />}
      {left && <img className="top" src={left} alt={leftLabel} draggable={false} />}
      {overlay && <img className={`overlay ${overlayKind || ''}`} src={overlay} alt="" draggable={false} />}
      <div className="handle" aria-hidden="true"><span>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6.5 4.5 2 9l4.5 4.5M11.5 4.5 16 9l-4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span></div>
      <span className="tag l">{leftLabel}</span>
      <span className="tag r">{rightLabel}</span>
    </div>
  );
}
