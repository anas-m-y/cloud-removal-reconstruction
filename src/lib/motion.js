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
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.2 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); lenis = null; };
  }, []);
}

// Section entrances: heading, then text, then pictures, staggered as each section comes into view. Plays once.
const REVEAL = '.sec-head > *, .plates figure, .facts > div, .steps li, .mix > *, .pg-filters, .thumbs, .pg > *, .try > *, .chart-block, .issues li, .about > div, .footer > *';
export function useReveal(ready) {
  useEffect(() => {
    if (!ready || reducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.section').forEach((sec) => {
        const items = sec.querySelectorAll(REVEAL); if (!items.length) return;
        gsap.from(items, { y: 28, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity',
          scrollTrigger: { trigger: sec, start: 'top 78%', once: true } });
      });
    });
    return () => ctx.revert();
  }, [ready]);
}
