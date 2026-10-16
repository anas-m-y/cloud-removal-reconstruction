import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;
export const scrollToId = (id) => {
  const el = document.getElementById(id); if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -64 }); else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
};

// Lenis smooth scrolling driven by the GSAP ticker so ScrollTrigger stays in sync.
export function useSmoothScroll() {
  useEffect(() => {
    if (reducedMotion()) return undefined;
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); lenis = null; };
  }, []);
}
