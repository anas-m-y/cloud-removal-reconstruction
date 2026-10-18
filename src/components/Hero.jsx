import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import DecryptedText from '../bits/DecryptedText.jsx';
import CountUp from '../bits/CountUp.jsx';
import { GlassButton } from '../bits/Glass.jsx';
import CanvasBoundary, { hasWebGL } from '../three/CanvasBoundary.jsx';
import { gsap, ScrollTrigger, reducedMotion, scrollToId } from '../lib/motion.js';
import { sampleURL } from '../lib/data.js';
import { SITE } from '../config.js';

const SatelliteScene = lazy(() => import('../three/SatelliteScene.jsx'));

// Flat stand-in shown if WebGL is unavailable; it rides the same --scan variable.
const SatIcon = () => (
  <div className="sat-track"><svg className="sat-fallback" viewBox="0 0 120 48" aria-hidden="true">
    <rect x="2" y="14" width="40" height="18" rx="2" fill="#1b2f7a" stroke="#cfd8ea" />
    <rect x="78" y="14" width="40" height="18" rx="2" fill="#1b2f7a" stroke="#cfd8ea" />
    <path d="M42 23h12M66 23h12" stroke="#cfd8ea" strokeWidth="2" />
    <rect x="52" y="8" width="16" height="30" rx="2" fill="#c99a3c" />
    <circle cx="60" cy="42" r="3" fill="#8ff3ff" />
  </svg></div>
);

// The one orchestrated moment: scrolling flies a radar satellite across the scene.
// Its swath sweeps the image, and behind it v6's reconstruction replaces the cloud.
export default function Hero({ hero }) {
  const root = useRef(null), stage = useRef(null), frame = useRef(null), layer = useRef(null);
  const pass = useRef({ p: 0, imgW: 0 });
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(0);
  const [gl] = useState(hasWebGL);
  const [active, setActive] = useState(true);
  const m = hero.metrics;

  // Measure where the image sits inside the stage so the 3D scene can work in CSS pixels.
  useLayoutEffect(() => {
    const s = layer.current, f = frame.current;
    const measure = () => {
      const sb = s.getBoundingClientRect(), fb = f.getBoundingClientRect();
      Object.assign(pass.current, { stageW: sb.width, stageH: sb.height, imgLeft: fb.left - sb.left, imgTop: fb.top - sb.top, imgW: fb.width, imgH: fb.height, laneH: fb.top - sb.top });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(s); ro.observe(f);
    return () => ro.disconnect();
  }, []);

  // Stop rendering the satellite once the hero has scrolled away.
  // (A scroll check rather than IntersectionObserver: the GSAP pin confuses observers in some browsers.)
  useEffect(() => {
    let raf = 0;
    const check = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      const b = stage.current?.getBoundingClientRect(); if (!b) return;
      setActive(b.bottom > -150 && b.top < window.innerHeight + 150);
    }); };
    check(); window.addEventListener('scroll', check, { passive: true }); window.addEventListener('resize', check);
    return () => { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); cancelAnimationFrame(raf); };
  }, []);

  useLayoutEffect(() => {
    const el = stage.current;
    const set = (p) => {
      pass.current.p = p / 100;
      el.style.setProperty('--scan', `${p}%`);
      el.style.setProperty('--band', p < 0.5 || p > 99.5 ? 0 : 1);
      setPct(Math.round(p)); setDone(p > 99);
    };
    if (reducedMotion()) { set(100); return undefined; }
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      const drive = (opts) => {
        const st = { v: 0 };
        gsap.to(st, { v: 100, ease: 'none', scrollTrigger: { ...opts, scrub: 0.6, onUpdate: (s) => set(s.progress * 100) } });
      };
      mm.add('(min-width: 861px)', () => drive({ trigger: root.current, start: 'top top', end: '+=150%', pin: root.current.querySelector('.hero-pin') }));
      mm.add('(max-width: 860px)', () => drive({ trigger: frame.current, start: 'top 70%', end: 'bottom 20%' }));
      gsap.from('.hero-copy > *', { opacity: 0, y: 22, duration: 1, stagger: 0.09, ease: 'power3.out', delay: 0.15 });
      gsap.from('.scope', { opacity: 0, y: 30, scale: 0.97, duration: 1.2, ease: 'power3.out', delay: 0.25 });
    }, root);
    return () => { ctx.revert(); ScrollTrigger.refresh(); };
  }, []);

  return (
    <section className="hero" ref={root} id="top" aria-label="Introduction">
      <div className="hero-pin">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><i />SAR-optical fusion · Sentinel-1 + Sentinel-2 + Landsat</p>
            <h1 className="wordmark">
              <DecryptedText text={SITE.name} animateOn="view" sequential revealDirection="start" speed={55} useOriginalCharsOnly={false}
                characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" encryptedClassName="dec-enc" />
            </h1>
            <p className="tagline">{SITE.tagline}</p>
            <p className="fulltitle">{SITE.fullTitle}. A GAN that fuses Sentinel-1 radar with optical imagery to rebuild cloud-covered scenes from Sentinel-2 and Landsat 8/9.</p>
            <div className="hero-actions">
              <GlassButton variant="primary" onClick={() => scrollToId('playground')}>Open the playground<span aria-hidden="true" className="arr">→</span></GlassButton>
              <GlassButton onClick={() => scrollToId('results')}>See the results</GlassButton>
            </div>
          </div>
          <div className="scope">
            <div className="scope-stage" ref={stage} style={{ '--scan': '0%', '--band': 0 }}>
              <div className="orbit" aria-hidden="true" />
              <div className="scope-glow" aria-hidden="true" />
              <div className="scope-frame" ref={frame}>
                <img src={sampleURL(hero.id, 'input')} alt={`Cloudy ${hero.sensor} image`} />
                <img className="after" src={sampleURL(hero.id, 'v6')} alt="The same scene reconstructed by CLOUDLESS v6" />
                <img className="radar-band" src={sampleURL(hero.id, 'sar')} alt="" aria-hidden="true" />
                <div className="scope-grid" />
                <div className="scan-edge" aria-hidden="true" />
                <span className="frame-tag l" style={{ opacity: pct > 6 ? 1 : 0 }}>Cloudless v6</span>
                <span className="frame-tag r" style={{ opacity: pct < 94 ? 1 : 0 }}>Cloudy input</span>
                <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
              </div>
              <div className="sat-layer" ref={layer} aria-hidden="true">
                {gl ? (
                  <CanvasBoundary fallback={<SatIcon />}>
                    <Suspense fallback={null}><SatelliteScene pass={pass} active={active} /></Suspense>
                  </CanvasBoundary>
                ) : <SatIcon />}
              </div>
            </div>
            <dl className="telemetry" aria-live="polite">
              <div><dt>Pass</dt><dd className="num">{pct}%</dd></div>
              <div><dt>Cloud cover</dt><dd className="num">{Math.round(hero.cloud_fraction * 100)}%</dd></div>
              <div><dt>PSNR vs clear image</dt><dd className="num">
                {done ? <CountUp from={m.input.psnr} to={m.v6.psnr} decimals={1} duration={1.1} trigger="load" suffix=" dB" /> : `${m.input.psnr.toFixed(1)} dB`}
              </dd></div>
            </dl>
            <div className="scope-legend"><span>{hero.source}</span><span className="r"><i />Sentinel-1 radar pass</span></div>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true">Scroll to fly the pass<i /></div>
      </div>
    </section>
  );
}
