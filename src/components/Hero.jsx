import { useLayoutEffect, useRef, useState } from 'react';
import DecryptedText from '../bits/DecryptedText.jsx';
import CountUp from '../bits/CountUp.jsx';
import { gsap, ScrollTrigger, reducedMotion, scrollToId } from '../lib/motion.js';
import { sampleURL } from '../lib/data.js';
import { SITE } from '../config.js';

// The one orchestrated moment: scrolling drives a satellite pass across the scene.
// Behind the amber scan line the radar sees the ground, and v6's reconstruction replaces the cloud.
export default function Hero({ hero }) {
  const root = useRef(null), frame = useRef(null);
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(0);
  const m = hero.metrics;

  useLayoutEffect(() => {
    const el = frame.current;
    if (reducedMotion()) { el.style.setProperty('--scan', '100%'); el.style.setProperty('--band', 0); setPct(100); setDone(true); return undefined; }
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      const drive = (opts) => {
        const st = { v: 0 };
        gsap.to(st, {
          v: 100, ease: 'none',
          scrollTrigger: { ...opts, scrub: 0.6, onUpdate: (s) => { const p = s.progress * 100; el.style.setProperty('--scan', `${p}%`); el.style.setProperty('--band', p < 1 || p > 98 ? 0 : 1); setPct(Math.round(p)); setDone(p > 99); } },
        });
      };
      mm.add('(min-width: 861px)', () => drive({ trigger: root.current, start: 'top top', end: '+=130%', pin: root.current.querySelector('.hero-pin') }));
      mm.add('(max-width: 860px)', () => drive({ trigger: el, start: 'top 75%', end: 'bottom 25%' }));
      gsap.from('.hero-copy > *', { opacity: 0, y: 18, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.15 });
      gsap.from(el.parentElement, { opacity: 0, scale: 0.97, duration: 1.1, ease: 'power3.out', delay: 0.25 });
    }, root);
    return () => { ctx.revert(); ScrollTrigger.refresh(); };
  }, []);

  return (
    <section className="hero" ref={root} id="top" aria-label="Introduction">
      <div className="hero-pin">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1 className="wordmark">
              <DecryptedText text={SITE.name} animateOn="view" sequential revealDirection="start" speed={55} useOriginalCharsOnly={false}
                characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" encryptedClassName="dec-enc" />
            </h1>
            <p className="tagline">{SITE.tagline}</p>
            <p className="fulltitle">{SITE.fullTitle}. A GAN that fuses Sentinel-1 radar with optical imagery to rebuild cloud-covered scenes from Sentinel-2 and Landsat 8/9.</p>
            <div className="hero-actions">
              <button className="btn primary" onClick={() => scrollToId('playground')}>Open the playground</button>
              <button className="btn" onClick={() => scrollToId('results')}>See the results</button>
            </div>
          </div>
          <div className="scope">
            <div className="scope-frame" ref={frame} style={{ '--scan': '0%', '--band': 0 }}>
              <img src={sampleURL(hero.id, 'input')} alt={`Cloudy ${hero.sensor} image`} />
              <img className="after" src={sampleURL(hero.id, 'v6')} alt="The same scene reconstructed by CLOUDLESS v6" />
              <img className="radar-band" src={sampleURL(hero.id, 'sar')} alt="" aria-hidden="true" />
              <div className="scope-grid" />
              <div className="scanline" aria-hidden="true" />
              <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            </div>
            <dl className="telemetry" aria-live="polite">
              <div><dt>Pass</dt><dd className="num">{pct}%</dd></div>
              <div><dt>Cloud cover</dt><dd className="num">{Math.round(hero.cloud_fraction * 100)}%</dd></div>
              <div><dt>PSNR vs clear image</dt><dd className="num">
                {done ? <CountUp from={m.input.psnr} to={m.v6.psnr} decimals={1} duration={1.1} trigger="load" suffix=" dB" /> : `${m.input.psnr.toFixed(1)} dB`}
              </dd></div>
            </dl>
            <div className="scope-legend"><span>{hero.source}</span><span className="r">Radar pass</span></div>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true">Scroll to run the pass<i /></div>
      </div>
    </section>
  );
}
