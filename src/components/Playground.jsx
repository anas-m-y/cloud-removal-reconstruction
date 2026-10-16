import { useEffect, useMemo, useState } from 'react';
import Compare from './Compare.jsx';
import CountUp from '../bits/CountUp.jsx';
import ModelLoader from './ModelLoader.jsx';
import { sampleURL } from '../lib/data.js';
import { loadPixels, paste, pixelsToURL, psnr, ssim, meanAbsDiff } from '../lib/img.js';
import { reconstruct } from '../lib/model.js';
import { SITE } from '../config.js';

const FILTERS = [['all', 'All 24'], ['sp', 'Sentinel-2 spring'], ['ac', 'Sentinel-2 AllClear'], ['ls', 'Landsat']];
const OVERLAYS = [['none', 'None'], ['conf', 'Confidence'], ['mask', 'Cloud mask'], ['sar', 'Radar']];

function Seg({ value, onChange, options, label, disabled }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => <button key={v} aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}
function Switch({ checked, onChange, label, radar, disabled }) {
  return <button className={`switch${radar ? ' radar' : ''}`} role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}
const pct = (q) => `${Math.round(q * 100)}th`;

export default function Playground({ gallery }) {
  const samples = gallery.samples;
  const [filter, setFilter] = useState('all');
  const [id, setId] = useState((samples.find((x) => x.id === SITE.heroId) || samples[0]).id);
  const [model, setModel] = useState('v6');
  const [radar, setRadar] = useState(true);
  const [flag, setFlag] = useState('correct');
  const [keep, setKeep] = useState(false);
  const [against, setAgainst] = useState('input');
  const [overlay, setOverlay] = useState('none');
  const [live, setLive] = useState({});           // key -> { px, ms, backend, diff }
  const [busy, setBusy] = useState(false);
  const [liveErr, setLiveErr] = useState('');
  const [view, setView] = useState(null);

  const s = samples.find((x) => x.id === id);
  const shown = useMemo(() => samples.filter((x) => filter === 'all' || x.src === filter), [samples, filter]);
  const isV6 = model === 'v6';
  const variant = isV6 ? `v6${radar ? '' : '_nosar'}${flag === 'swapped' ? '_wrongflag' : ''}` : 'v5b';
  const liveKey = `${id}|${radar}|${flag}`;
  const liveRes = isV6 ? live[liveKey] : null;
  const precomputed = variant in s.metrics;
  const canKeep = s.has_mask;

  useEffect(() => { if (!s.has_mask) { setKeep(false); if (overlay === 'mask') setOverlay('none'); } }, [s, overlay]);

  // Build the output image and its metrics whenever the selection changes.
  useEffect(() => {
    let off = false;
    (async () => {
      const [inPx, tPx] = await Promise.all([loadPixels(sampleURL(id, 'input')), loadPixels(sampleURL(id, 'target'))]);
      let outPx = null, outURL = null;
      if (liveRes) outPx = liveRes.px;
      else if (precomputed) { outURL = sampleURL(id, variant); outPx = await loadPixels(outURL); }
      if (outPx && keep && canKeep) { outPx = paste(outPx, inPx, await loadPixels(sampleURL(id, 'mask'))); outURL = null; }
      if (outPx && !outURL) outURL = pixelsToURL(outPx);
      const m = outPx ? { out: psnr(outPx, tPx), outS: ssim(outPx, tPx) } : null;
      const base = { inp: psnr(inPx, tPx), inpS: ssim(inPx, tPx) };
      if (!off) setView({ outURL, ...base, ...m });
    })().catch((e) => !off && setLiveErr(String(e.message || e)));
    return () => { off = true; };
  }, [id, variant, keep, canKeep, liveRes, precomputed]);

  const runLive = async () => {
    setBusy(true); setLiveErr('');
    try {
      const [inPx, sarPx] = await Promise.all([loadPixels(sampleURL(id, 'input')), radar ? loadPixels(sampleURL(id, 'sar_raw')) : null]);
      const sensor = (s.sensor === 'Landsat' ? 1 : 0) ^ (flag === 'swapped' ? 1 : 0);
      const r = await reconstruct(inPx, sarPx, sensor, gallery.sar_range_db);
      let diff = null;
      if (precomputed) diff = meanAbsDiff(r.px, await loadPixels(sampleURL(id, variant)));
      setLive((L) => ({ ...L, [liveKey]: { ...r, diff } }));
    } catch (e) { setLiveErr(String(e.message || e)); }
    setBusy(false);
  };

  const modelName = isV6 ? `v6${radar ? '' : ', no radar'}${flag === 'swapped' ? ', swapped flag' : ''}` : 'v5b';
  const leftURL = against === 'input' ? sampleURL(id, 'input') : sampleURL(id, 'target');
  const leftLabel = against === 'input' ? 'Cloudy input' : 'Clear image, other date';
  const ov = overlay === 'conf' ? sampleURL(id, 'conf') : overlay === 'mask' ? sampleURL(id, 'mask') : overlay === 'sar' ? sampleURL(id, 'sar') : null;
  const d = view && view.out != null ? view.out - view.inp : null;

  return (
    <section className="section" id="playground">
      <div className="wrap">
        <div className="sec-head">
          <h2>Playground</h2>
          <p>Twenty-four held-out scenes the model never trained on. They were picked at evenly spaced ranks of v6's improvement, so weak results are here alongside strong ones. Switch the model, take away the radar, give it the wrong satellite flag, and watch the numbers.</p>
        </div>

        <div className="pg-filters" role="group" aria-label="Filter by source">
          {FILTERS.map(([v, l]) => <button key={v} className="chip" aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</button>)}
        </div>
        <div className="thumbs" role="list" aria-label="Scenes">
          {shown.map((x) => (
            <button key={x.id} role="listitem" className="thumb" aria-current={x.id === id} onClick={() => setId(x.id)} aria-label={`${x.source}${x.scene ? `, scene ${x.scene}` : ''}, ${Math.round(x.cloud_fraction * 100)}% cloud`}>
              <img src={sampleURL(x.id, 'input')} alt="" loading="lazy" /><span>{x.sensor === 'Landsat' ? 'L8/9' : 'S2'}</span>
            </button>
          ))}
        </div>

        <div className="pg">
          <div className="viewer">
            {view?.outURL
              ? <Compare left={leftURL} right={view.outURL} leftLabel={leftLabel} rightLabel={liveRes ? `${modelName}, live` : modelName} overlay={ov} overlayKind={overlay} />
              : <div className="empty"><div><p>This combination was not precomputed.</p><button className="btn primary" onClick={runLive} disabled={busy}>Run it live on this device</button></div></div>}
            <p className="viewer-note">
              {overlay === 'conf' && 'Brighter means the model was less certain: the spread of 16 passes with dropout switched on. '}
              {overlay === 'mask' && 'Highlighted pixels are flagged as cloud by the satellite\'s own mask. '}
              {overlay === 'sar' && 'Sentinel-1 radar for the same place, shown in amber. '}
              {against === 'target' && 'The clear image was taken on a different date, so some differences are real change on the ground.'}
            </p>
          </div>

          <div className="console">
            <section aria-label="Model controls">
              <h3>Model</h3>
              <div className="ctrl"><span>Generator</span><Seg label="Generator" value={model} onChange={setModel} options={[['v6', 'v6'], ['v5b', 'v5b']]} /></div>
              <div className="ctrl"><span>Radar input</span><Switch label="Radar input" radar checked={isV6 ? radar : true} onChange={setRadar} disabled={!isV6} />
                {!isV6 && <small>v5b always uses radar and has no flags.</small>}</div>
              <div className="ctrl"><span>Satellite flag</span><Seg label="Satellite flag" value={flag} onChange={setFlag} disabled={!isV6} options={[['correct', 'Correct'], ['swapped', 'Swapped']]} /></div>
              <div className="ctrl"><span>Keep clear pixels</span><Switch label="Keep clear pixels" checked={keep && canKeep} onChange={setKeep} disabled={!canKeep} />
                <small>{canKeep ? 'Only replace pixels the cloud mask flags; the rest stay as captured.' : 'No cloud mask exists for this source.'}</small></div>
            </section>
            <section aria-label="View controls">
              <h3>View</h3>
              <div className="ctrl"><span>Compare with</span><Seg label="Compare with" value={against} onChange={setAgainst} options={[['input', 'Input'], ['target', 'Clear image']]} /></div>
              <div className="ctrl" style={{ gridTemplateColumns: '1fr' }}>
                <Seg label="Overlay" value={overlay} onChange={setOverlay} options={OVERLAYS.map(([v, l]) => [v, l])} />
              </div>
            </section>
            <section aria-label="Scores">
              <h3>Scores against the clear image</h3>
              <dl className="readouts">
                <div className="readout"><dt>PSNR, output</dt><dd>{view?.out != null ? <CountUp key={id} to={view.out} from={view.inp} decimals={2} duration={0.6} trigger="load" /> : '–'}<small>dB</small></dd>
                  {d != null && <div className={`delta ${d >= 0 ? 'up' : 'down'}`}>{d >= 0 ? '+' : ''}{d.toFixed(2)} dB vs input</div>}</div>
                <div className="readout"><dt>PSNR, cloudy input</dt><dd>{view ? view.inp.toFixed(2) : '–'}<small>dB</small></dd></div>
                <div className="readout"><dt>SSIM, output</dt><dd>{view?.outS != null ? view.outS.toFixed(3) : '–'}</dd></div>
                <div className="readout"><dt>SSIM, cloudy input</dt><dd>{view ? view.inpS.toFixed(3) : '–'}</dd></div>
              </dl>
              <p className="viewer-note" style={{ marginTop: 12, fontSize: 13 }}>The clear image is from another date, so one scene can swing a dB or two either way. The composite test under Results is the fair comparison.</p>
            </section>
            <section aria-label="About this scene">
              <div className="meta">
                <span><b>{s.source}</b>{s.scene ? `, scene ${s.scene}` : ''}</span>
                <span>{Math.round(s.cloud_fraction * 100)}% cloud. Picked at the {pct(s.rank_quantile)} percentile of v6's gain.</span>
              </div>
            </section>
            <section aria-label="Run live">
              <button className="btn" onClick={runLive} disabled={!isV6 || busy}>{busy ? 'Running…' : liveRes ? 'Run again on this device' : 'Run v6 live on this device'}</button>
              {busy && <ModelLoader compact />}
              {liveRes && <p className="live-out">Ran in <b className="num">{Math.round(liveRes.ms)} ms</b> on {liveRes.backend}.
                {liveRes.diff != null && <> Differs from the precomputed image by <b className="num">{liveRes.diff.toFixed(2)}</b> grey levels out of 255 on average.</>}</p>}
              {!isV6 && <p className="live-out">Only v6 runs in the browser.</p>}
              {liveErr && <p className="err">{liveErr}</p>}
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
