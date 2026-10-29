import { useLayoutEffect, useRef } from 'react';
import { gsap, reducedMotion } from '../lib/motion.js';
import { sampleURL } from '../lib/data.js';
import { NAMES } from '../config.js';

const MIX = [
  ['Sentinel-2, SEN12MS-CR spring', '5,920 paired patches with Sentinel-1', 35],
  ['Landsat 8/9, AllClear', 'real cloudy and clear pairs, own QA cloud mask', 30],
  ['Sentinel-2, AllClear', 'real pairs, filtered for false cloud flags', 25],
  ['Synthetic bright terrain', 'real cloud layers on clear desert scenes, radar blanked', 10],
];

function Node({ x, y, w, h, title, sub, cls = '', img, imgClass }) {
  return (
    <g className={`node ${cls}`} transform={`translate(${x},${y})`}>
      <rect width={w} height={h} />
      <text x="14" y="28">{title}</text>
      {sub && sub.map((t, i) => <text key={i} className="sub" x="14" y={48 + i * 17}>{t}</text>)}
      {img && <image className={imgClass} href={img} x={w - 82} y={(h - 72) / 2} width="72" height="72" preserveAspectRatio="xMidYMid slice" />}
    </g>
  );
}

export default function Pipeline({ hero }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (reducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      const wires = gsap.utils.toArray('.wire');
      wires.forEach((p) => { const l = p.getTotalLength(); gsap.set(p, { strokeDasharray: l, strokeDashoffset: l }); });
      gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top 70%' } })
        .from('.pipe .node', { opacity: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out' })
        .to(wires, { strokeDashoffset: 0, duration: 0.9, stagger: 0.06, ease: 'power2.inOut' }, 0.2);
      gsap.from('.mix-row .bar i', { scaleX: 0, transformOrigin: 'left', duration: 0.9, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.mix', start: 'top 80%' } });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="section field" id="method" ref={ref}>
      <div className="wrap">
        <div className="sec-head">
          <h2>How a scene is rebuilt</h2>
          <p>A U-Net generator trained adversarially against a patch discriminator. It takes the cloudy image and the radar image together, and two small conditioning signals tell it which satellite it is looking at and whether radar is available.</p>
        </div>
        <div className="pipe" role="img" aria-label="Pipeline: cloudy optical image and Sentinel-1 radar enter a U-Net encoder; sensor and radar flags modulate the decoder through FiLM layers; the decoder with attention-weighted skip connections outputs a cloud-free image and a confidence map.">
          <svg viewBox="0 0 1200 330">
            <path className="wire opt" d="M256 70 C 290 70, 290 150, 320 150" />
            <path className="wire sar" d="M256 250 C 290 250, 290 180, 320 180" />
            <path className="wire" d="M490 165 L 540 165" />
            <path className="wire" d="M635 82 L 635 120" />
            <path className="wire" d="M730 165 L 780 165" />
            <path className="wire opt" d="M950 150 C 975 150, 975 70, 1000 70" />
            <path className="wire" d="M950 180 C 975 180, 975 250, 1000 250" />
            <path className="wire" d="M405 210 C 405 300, 865 300, 865 212" strokeDasharray="5 5" />
            <Node x={16} y={22} w={240} h={96} cls="opt" title="Cloudy optical" sub={['red, green, blue', 'Sentinel-2 or Landsat']} img={sampleURL(hero.id, 'input')} />
            <Node x={16} y={202} w={240} h={96} cls="sar" title="Sentinel-1 radar" sub={['VV and VH', 'optional']} img={sampleURL(hero.id, 'sar_raw')} imgClass="radar-img" />
            <Node x={320} y={110} w={170} h={100} title="Encoder" sub={['5 channels in', '5 strided convs']} />
            <Node x={540} y={10} w={190} h={72} cls="cond" title="Satellite + radar flags" sub={['learned embeddings']} />
            <Node x={540} y={120} w={190} h={90} title="Bottleneck + FiLM" sub={['scale and shift', 'per channel']} />
            <Node x={780} y={110} w={170} h={100} title="Decoder" sub={['attention on skips', 'dropout']} />
            <Node x={1000} y={22} w={190} h={96} cls="opt" title="Clear image" sub={['generated']} img={sampleURL(hero.id, 'v6')} />
            <Node x={1000} y={202} w={190} h={96} title="Confidence" sub={['16 passes']} img={sampleURL(hero.id, 'conf')} />
            <text className="sub" x="635" y="318" textAnchor="middle">skip connections, weighted by spatial attention</text>
          </svg>
        </div>
        <ol className="steps">
          <li><strong>Stack the inputs</strong>Cloudy RGB and the two radar bands become one 5-channel image.</li>
          <li><strong>Encode</strong>Five strided convolutions compress the scene to its structure.</li>
          <li><strong>Condition</strong>FiLM layers shift features by satellite and by whether radar is present.</li>
          <li><strong>Decode</strong>Skip connections, weighted by spatial attention, restore detail.</li>
          <li><strong>Judge and score</strong>A patch discriminator, L1, VGG perceptual and Gram losses train it; 16 dropout passes give a confidence map.</li>
        </ol>
        <div className="mix">
          <div><h3>What {NAMES.v6} learned from</h3><p>8,000 fine-tuning steps from {NAMES.v5b} on a T4 GPU, about 75 minutes. Radar was blanked on a quarter of real samples so the model also works without it.</p></div>
          <div className="mix-rows">
            {MIX.map(([name, sub, pct]) => (
              <div className="mix-row" key={name}>
                <div>{name}<span className="sub">{sub}</span></div>
                <div className="bar" aria-hidden="true"><i style={{ width: `${(pct / 35) * 100}%` }} /></div>
                <div className="num">{pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
