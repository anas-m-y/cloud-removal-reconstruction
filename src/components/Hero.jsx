import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Button from '../bits/Button.jsx';
import CanvasBoundary, { hasWebGL } from '../three/CanvasBoundary.jsx';
import { gsap, ScrollTrigger, reducedMotion, scrollToId } from '../lib/motion.js';
import { sampleURL } from '../lib/data.js';
import { SITE, NAMES } from '../config.js';

const SatelliteScene = lazy(() => import('../three/SatelliteScene.jsx'));

// The hero is the cloud. A wall of held-out cloudy scenes sits under a Sentinel-1 style satellite.
// Scrolling flies the satellite across the wall: under its radar beam each tile turns to radar speckle,
// and behind the beam the tile becomes the real reconstruction for that scene.
//
// One source of truth keeps the beam and the tiles in step: GSAP's scrub smooths scroll into `goal`,
// a ticker eases `x` toward it, writes every tile's reveal, and the 3D scene reads the same `x`.

const OUT = 'v6_p4_match';                 // the refined A7 output shipped for every gallery scene
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const FEATHER = 16;                         // px of soft edge on each reveal front (matches styles.css)

export default function Hero({ gallery }) {
  const root = useRef(null), pin = useRef(null), wall = useRef(null), layer = useRef(null);
  const pass = useRef({ x: 0, on: 0, imgW: 0 });
  const [gl] = useState(hasWebGL);
  const [active, setActive] = useState(true);
  const [cleared, setCleared] = useState(0);
  const ids = SITE.heroWall.filter((id) => gallery.samples.some((s) => s.id === id));
  const byId = Object.fromEntries(gallery.samples.map((s) => [s.id, s]));

  useLayoutEffect(() => {
    const L = pass.current, w = wall.current;
    let tiles = [], tile = 0, band = 0, goal = 0, xStart = 0, xEnd = 0, lastCount = -1;

    const measure = () => {
      const lb = layer.current.getBoundingClientRect(), wb = w.getBoundingClientRect();
      tiles = [...w.querySelectorAll('.tile')].filter((t) => t.offsetParent !== null).map((el) => ({ el, left: el.offsetLeft, size: el.offsetWidth }));
      tile = tiles[0]?.size || 160;
      const scale = tile / 170;                            // the satellite spans about one tile, wing tip to wing tip
      band = tile * 0.42;                                  // half the width of the beam where it meets the ground
      Object.assign(L, { stageW: lb.width, stageH: lb.height, imgLeft: wb.left - lb.left, imgTop: wb.top - lb.top, imgW: wb.width, imgH: wb.height,
        laneH: wb.top - lb.top, scale, beamW: band * 2 });
      // Desktop: parked just off the first column, beam off. Phone: waits off-screen and flies in with the scroll.
      xStart = lb.width < 700 ? -(L.imgLeft + 110 * scale) : -band * 1.2;
      xEnd = wb.width + (lb.right - wb.right) + 120 * scale; // flown clean out of the frame
    };

    const paint = () => {
      let count = 0;
      for (const t of tiles) {
        // Fronts run past the tile edge by the mask's feather, so a finished tile is fully opaque.
        const o = clamp(L.x - band * 0.55 - t.left, 0, t.size + FEATHER), r = clamp(L.x + band - t.left, 0, t.size + FEATHER);
        t.el.style.setProperty('--o', `${o}px`); t.el.style.setProperty('--r', `${r}px`);
        if (o >= t.size + FEATHER - 0.5) count += 1;
      }
      L.on = L.x > -band && L.x < L.imgW + band ? 1 : 0;
      if (count !== lastCount) { lastCount = count; setCleared(count); }
    };

    measure();
    const ro = new ResizeObserver(() => { measure(); paint(); });
    ro.observe(w); ro.observe(layer.current);

    if (reducedMotion()) {                                // no flight: the wall is shown cleared, the satellite rests over it
      L.x = L.imgW + band * 2; paint(); L.x = L.imgW / 2; L.on = 0;
      return () => ro.disconnect();
    }

    L.x = xStart; goal = 0; paint();
    const tick = (time, dtMs) => {                        // critically damped follow: no overshoot, no stepping
      const target = xStart + goal * (xEnd - xStart);
      const k = 1 - Math.exp(-(dtMs / 1000) * 9);
      if (Math.abs(target - L.x) > 0.05) { L.x += (target - L.x) * k; paint(); }
    };
    gsap.ticker.add(tick);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      const drive = (opts) => {
        const st = { v: 0 };
        gsap.to(st, { v: 1, ease: 'none', scrollTrigger: { ...opts, scrub: 1, invalidateOnRefresh: true, onUpdate: (s) => { goal = s.progress; } } });
      };
      mm.add('(min-width: 861px)', () => drive({ trigger: root.current, start: 'top top', end: '+=140%', pin: pin.current, anticipatePin: 1 }));
      mm.add('(max-width: 860px)', () => drive({ trigger: w, start: 'top 72%', end: 'bottom 22%' }));
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('.hero h1 .line', { yPercent: 40, opacity: 0, duration: 1.1, stagger: 0.08 })
        .from('.hero-copy > *', { y: 20, opacity: 0, duration: 0.9, stagger: 0.07 }, 0.25)
        .from('.tile', { y: 24, opacity: 0, duration: 0.9, stagger: { each: 0.035, from: 'start' } }, 0.2)
        .from('.sat-layer', { opacity: 0, duration: 1.2, ease: 'power2.out' }, 0.6);
    }, root);

    return () => { gsap.ticker.remove(tick); ro.disconnect(); ctx.revert(); ScrollTrigger.refresh(); };
  }, []);

  // Stop rendering the satellite once the hero has scrolled away.
  useEffect(() => {
    let raf = 0;
    const check = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      const b = root.current?.getBoundingClientRect(); if (!b) return;
      setActive(b.bottom > -100 && b.top < window.innerHeight + 100);
    }); };
    check(); window.addEventListener('scroll', check, { passive: true }); window.addEventListener('resize', check);
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); cancelAnimationFrame(raf); };
  }, []);

  const total = ids.length;
  return (
    <section className="hero" ref={root} id="top" aria-label="Introduction">
      <div className="hero-pin" ref={pin}>
        <div className="wrap">
          <h1><span className="line">See the ground</span> <span className="line">through any sky</span></h1>
          <div className="hero-row">
            <div className="hero-copy">
              <p className="lead">A GAN that fuses Sentinel-1 radar with cloudy Sentinel-2 and Landsat images and rebuilds the ground underneath. It runs in your browser.</p>
              <div className="hero-actions">
                <Button variant="primary" onClick={() => scrollToId('playground')}>Open the playground</Button>
                <Button onClick={() => scrollToId('results')}>See the results</Button>
              </div>
              <p className="hero-note" aria-live="polite">
                {cleared === 0 ? `${total} held-out scenes the model never trained on. Scroll to fly the radar pass.`
                  : cleared < total ? `Cleared ${cleared} of ${total}. Each tile is ${NAMES.v6}'s real output for that scene.`
                    : `All ${total} cleared by ${NAMES.v6}. Pick any of them in the playground.`}
              </p>
            </div>
            <div className="hero-stage">
              <div className="wall" ref={wall}>
                {ids.map((id) => {
                  const s = byId[id];
                  return (
                    <figure className="tile" key={id}>
                      <img src={sampleURL(id, 'input')} alt={`Cloudy ${s.sensor} scene, ${Math.round(s.cloud_fraction * 100)}% cloud`} />
                      <img className="radar" src={sampleURL(id, 'sar_raw')} alt="" aria-hidden="true" />
                      <img className="out" src={sampleURL(id, OUT)} alt="" aria-hidden="true" />
                    </figure>
                  );
                })}
              </div>
              <div className="sat-layer" ref={layer} aria-hidden="true">
                {gl && (
                  <CanvasBoundary fallback={null}>
                    <Suspense fallback={null}><SatelliteScene pass={pass} active={active} /></Suspense>
                  </CanvasBoundary>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
