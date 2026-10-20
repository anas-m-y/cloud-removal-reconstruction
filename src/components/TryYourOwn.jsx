import { useRef, useState } from 'react';
import Compare from './Compare.jsx';
import { GlassButton } from '../bits/Glass.jsx';
import ModelLoader from './ModelLoader.jsx';
import { Seg, Switch } from './Controls.jsx';
import { sampleURL } from '../lib/data.js';
import { pixelsFromImage, pixelsToURL } from '../lib/img.js';
import { reconstruct } from '../lib/model.js';

export default function TryYourOwn({ hero }) {
  const [src, setSrc] = useState(null);       // { px, url, name }
  const [sensor, setSensor] = useState(0);
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [over, setOver] = useState(false);
  const [passes, setPasses] = useState(4);         // flipped copies averaged; 1 is fastest
  const [match, setMatch] = useState(true);        // match colours and keep clear pixels using an estimated cloud mask
  const [showMask, setShowMask] = useState(false);
  const input = useRef(null);

  const take = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('That file is not an image. Use a PNG, JPG or WebP.'); return; }
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => { const px = pixelsFromImage(img, true); setSrc({ px, url: pixelsToURL(px), name: file.name }); setOut(null); setErr(''); };
    img.onerror = () => setErr('This image could not be read. Try saving it as PNG or JPG.');
    img.src = url;
  };
  const useSample = () => {
    const img = new Image(); img.onload = () => { const px = pixelsFromImage(img, false); setSrc({ px, url: pixelsToURL(px), name: 'gallery scene' }); setOut(null); setSensor(hero.sensor === 'Landsat' ? 1 : 0); };
    img.src = sampleURL(hero.id, 'input');
  };
  const run = async () => {
    setBusy(true); setErr('');
    try { const r = await reconstruct(src.px, null, sensor, undefined, { passes, match }); setOut({ ...r, url: pixelsToURL(r.px), maskUrl: r.maskPx ? pixelsToURL(r.maskPx) : null }); }
    catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  };

  return (
    <section className="section" id="try">
      <div className="wrap">
        <div className="sec-head">
          <h2>Try your own image</h2>
          <p>The model runs entirely in your browser; nothing is uploaded. It downloads once (about 59 MB) and uses your GPU through WebGPU when available.</p>
        </div>
        <div className="try">
          <div>
            <div className={`drop${over ? ' over' : ''}`} role="button" tabIndex={0} onClick={() => input.current.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}>
              <strong>Drop a cloudy satellite image</strong>
              <p>or click to choose a file. The centre square is used, at 256 × 256 pixels.</p>
              <input ref={input} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files[0])} />
            </div>
            <div className="try-opts">
              <div className="ctrl"><span>Which satellite took it?</span>
                <div className="seg" role="group" aria-label="Satellite">
                  <button aria-pressed={sensor === 0} onClick={() => setSensor(0)}>Sentinel-2</button>
                  <button aria-pressed={sensor === 1} onClick={() => setSensor(1)}>Landsat</button>
                </div></div>
              <div className="ctrl"><span>Flip averaging</span><Seg label="Flip averaging" value={passes} onChange={setPasses} options={[[1, 'Off'], [4, '4 runs'], [8, '8 runs']]} />
                <small>Runs the model on flipped copies and averages them. A little cleaner, and slower in proportion to the runs.</small></div>
              <div className="ctrl"><span>Match colours</span><Switch label="Match colours and keep clear pixels" checked={match} onChange={setMatch} />
                <small>Guesses where the cloud was, matches the filled colour to the clear pixels around it, and keeps your original pixels everywhere else.</small></div>
              <p className="notice">No radar comes with an uploaded picture, so v6 runs in its no-radar mode. Screenshots are not calibrated reflectance, so treat the result as approximate. True-colour images at 10 to 30 m per pixel work best.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <GlassButton variant="primary" disabled={!src || busy} onClick={run}>{busy ? 'Reconstructing…' : 'Remove the clouds'}</GlassButton>
                <GlassButton onClick={useSample}>Use a gallery scene</GlassButton>
              </div>
              <ModelLoader />
              {err && <p className="err">{err}</p>}
            </div>
          </div>
          <div>
            {src && out ? (
              <>
                <Compare left={src.url} right={out.url} leftLabel="Your image" rightLabel={`v6, no radar${out.passes > 1 ? `, ${out.passes} runs` : ''}${out.maskUrl ? ', colour matched' : ''}`} overlay={showMask && out.maskUrl ? out.maskUrl : null} overlayKind="mask" />
                <p className="viewer-note">Ran in <span className="num">{Math.round(out.ms)} ms</span> on {out.backend}{out.passes > 1 ? `, ${out.passes} runs averaged` : ''}{out.maskUrl ? `, colour matching ${Math.round(out.refineMs)} ms` : ''}. <a href={out.url} download="cloudless-result.png">Download the result</a></p>
                {out.maskUrl && <div className="ctrl" style={{ marginTop: 8 }}><span>Show the estimated cloud mask</span><Switch label="Show the estimated cloud mask" checked={showMask} onChange={setShowMask} />
                  <small>This is a guess from where the model changed your picture, not a satellite product. Where it is wrong, a cloud edge can be left in or a clear patch repainted.</small></div>}
              </>
            ) : src ? (
              <div className="empty" style={{ backgroundImage: `url(${src.url})`, backgroundSize: 'cover' }}><span className="tag l" style={{ position: 'static' }}>{src.name}, ready</span></div>
            ) : (
              <div className="empty"><p>Your result appears here.</p></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
