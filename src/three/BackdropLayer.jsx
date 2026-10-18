import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import CanvasBoundary, { hasWebGL } from './CanvasBoundary.jsx';

const Backdrop = lazy(() => import('./Backdrop.jsx'));

// Fixed layer behind the page: a CSS mesh gradient that paints instantly, the ShaderGradient
// canvas fading in over it once loaded, and a veil that deepens after the hero so text stays readable.
export default function BackdropLayer() {
  const veil = useRef(null);
  const [gl] = useState(hasWebGL);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const t = Math.min(1, window.scrollY / (window.innerHeight * 2.2));
        veil.current?.style.setProperty('--veil', (0.12 + t * 0.4).toFixed(3));
      });
    };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    const vis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('visibilitychange', vis); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop-css" />
      {gl && visible && (
        <div className="backdrop-gl">
          <CanvasBoundary><Suspense fallback={null}><Backdrop /></Suspense></CanvasBoundary>
        </div>
      )}
      <div className="backdrop-veil" ref={veil} />
      <div className="backdrop-stars" />
    </div>
  );
}
