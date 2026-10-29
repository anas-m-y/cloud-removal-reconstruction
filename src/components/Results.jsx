import { useState } from 'react';
import { GroupedBars, DiffDots, DataTable } from './Charts.jsx';

const C = { input: '#5e6468', v5b: '#a7adaa', v6: '#5cb8ff', radar: '#2f6fa8' };
const SERIES = [{ key: 'in', label: 'Cloudy input', color: C.input }, { key: 'v5b', label: 'A6', color: C.v5b }, { key: 'v6', label: 'A7', color: C.v6 }];
const Legend = ({ items }) => (
  <div className="legend">{items.map((s) => <span key={s.label}><i className={s.dash ? 'dash' : ''} style={s.dash ? null : { background: s.color, opacity: s.alpha ?? 1 }} />{s.label}</span>)}</div>
);

export default function Results({ results }) {
  const [metric, setMetric] = useState('psnr');
  const [tables, setTables] = useState({});
  const toggle = (k) => setTables((t) => ({ ...t, [k]: !t[k] }));
  const R = results.real, sc = R.spring_by_scene;
  const realRows = [['Spring, scene 66', sc['66']], ['Spring, scene 75', sc['75']], ['Spring, scene 77', sc['77']], ['Sentinel-2 AllClear', R.ac], ['Landsat 8/9', R.ls]];
  const groups = realRows.map(([label, d]) => ({ label: label.replace('Spring, scene', 'Scene'), sub: label.startsWith('Spring') ? 'Sentinel-2 spring' : `n = ${d.n}`,
    values: { in: d[`${metric}_in`], v5b: d[`${metric}_v5b`], v6: d[`${metric}_v6`] } }));
  const isP = metric === 'psnr', fmt = isP ? (v) => v.toFixed(1) : (v) => v.toFixed(3);

  const comp = results.composite;
  const compSeries = [{ key: 'input', label: 'Cloudy input', color: C.input }, { key: 'v5b', label: 'A6', color: C.v5b },
    { key: 'v6', label: 'A7 with radar', color: C.v6 }, { key: 'v6_nosar', label: 'A7 without radar', color: C.radar }];
  const ab = results.ablation;

  return (
    <section className="section" id="results">
      <div className="wrap">
        <div className="sec-head">
          <h2>Results on held-out data</h2>
          <p>Every number here comes from scenes the model never saw in training, scored against a clear image. PSNR measures pixel error in decibels, higher is better. SSIM measures structural similarity from 0 to 1.</p>
        </div>
        <div className="charts">
          <div className="chart-block">
            <h3>A7 beats A6 on every test set</h3>
            <p>The biggest change is spring scene 66, bright terrain where A6 did no better than leaving the cloud in place. Synthetic bright-terrain training moved it from {sc['66'].psnr_v5b.toFixed(1)} to {sc['66'].psnr_v6.toFixed(1)} dB.</p>
            <div className="chart-tools">
              <Legend items={SERIES} />
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div className="seg" role="group" aria-label="Metric"><button aria-pressed={isP} onClick={() => setMetric('psnr')}>PSNR</button><button aria-pressed={!isP} onClick={() => setMetric('ssim')}>SSIM</button></div>
                <button className="linkbtn" onClick={() => toggle('real')}>{tables.real ? 'Show chart' : 'Show table'}</button>
              </div>
            </div>
            {tables.real
              ? <DataTable head={['Test set', 'n', 'Input', 'A6', 'A7']} rows={realRows.map(([l, d]) => [l, d.n, fmt(d[`${metric}_in`]), fmt(d[`${metric}_v5b`]), fmt(d[`${metric}_v6`])])} />
              : <GroupedBars groups={groups} series={SERIES} max={isP ? 40 : 1} unit={isP ? 'dB' : ''} fmt={fmt} labelKey="v6" />}
          </div>

          <div className="chart-block">
            <h3>The honest test: real cloud on a same-day clear image</h3>
            <p>Real cloud from one date was pasted onto a clear image of the same day, so the target is exact. Scores cover cloud pixels only. The dashed line is a simple baseline that fills cloud with the average colour of the visible ground: it still scores higher, because PSNR rewards smooth guesses over texture.</p>
            <div className="chart-tools">
              <Legend items={[...compSeries, { label: 'Flat colour fill', dash: true }]} />
              <button className="linkbtn" onClick={() => toggle('comp')}>{tables.comp ? 'Show chart' : 'Show table'}</button>
            </div>
            {tables.comp
              ? <DataTable head={['Method', 'Sentinel-2, dB', 'Landsat, dB']} rows={[['Cloudy input', 'input'], ['Flat colour fill', 'fill'], ['A6', 'v5b'], ['A7 with radar', 'v6'], ['A7 without radar', 'v6_nosar']].map(([l, k]) => [l, comp.ac.cloud_db[k].toFixed(2), comp.ls.cloud_db[k].toFixed(2)])} />
              : <div className="smalls">
                  {[['ac', 'Sentinel-2, AllClear'], ['ls', 'Landsat 8/9']].map(([k, l]) => (
                    <div key={k}><h4>{l} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(n = {comp[k].n})</span></h4>
                      <GroupedBars height={280} groups={[{ label: 'Cloud pixels', sub: `${Math.round(comp[k].cloud_fraction * 100)}% of the image on average`, ref: comp[k].cloud_db.fill, values: comp[k].cloud_db }]}
                        series={compSeries} max={40} unit="dB" fmt={(v) => v.toFixed(1)} refLine="fill" labelKey="v6" /></div>
                  ))}
                </div>}
            <p className="verdict">
              <strong>Radar helps.</strong> Removing it costs A7 {(comp.ac.cloud_db.v6 - comp.ac.cloud_db.v6_nosar).toFixed(2)} dB on Sentinel-2 and {(comp.ls.cloud_db.v6 - comp.ls.cloud_db.v6_nosar).toFixed(2)} dB on Landsat, and radar improves {Math.round(comp.ac.sar_helps * 100)}% and {Math.round(comp.ls.sar_helps * 100)}% of scenes.
              {' '}A7 beats A6 on cloud pixels in {Math.round(comp.ac.v6_beats_v5b * 100)}% and {Math.round(comp.ls.v6_beats_v5b * 100)}% of scenes. Keeping the clear pixels as captured lifts whole-image PSNR to {comp.ac.image_db.v6_paste} and {comp.ls.image_db.v6_paste} dB.
            </p>
          </div>

          {ab && <div className="chart-block">
            <h3>Does the model use the satellite flag?</h3>
            <p>We gave A7 the wrong satellite flag on {ab.ac.n} scenes per sensor and measured the PSNR lost on cloud pixels. Bars show 95% intervals.</p>
            <div className="chart-tools"><span /><button className="linkbtn" onClick={() => toggle('ab')}>{tables.ab ? 'Show chart' : 'Show table'}</button></div>
            {(() => {
              const rows = [['Sentinel-2, radar on', ab.ac.sar_on], ['Sentinel-2, radar off', ab.ac.sar_off], ['Landsat, radar on', ab.ls.sar_on], ['Landsat, radar off', ab.ls.sar_off]];
              return tables.ab
                ? <DataTable head={['Setting', 'Correct flag, dB', 'Swapped flag, dB', 'Difference', '± s.e.', 'Correct wins']} rows={rows.map(([l, d]) => [l, d.correct.toFixed(2), d.wrong.toFixed(2), d.diff.toFixed(2), d.se.toFixed(2), `${Math.round(d.win * 100)}%`])} />
                : <DiffDots color={C.v6} rows={rows.map(([label, d]) => ({ label, ...d }))} />;
            })()}
            <p className="verdict"><strong>Yes for Sentinel-2, no for Landsat.</strong> Swapping the flag costs {ab.ac.sar_on.diff.toFixed(2)} dB on Sentinel-2, while Landsat is unchanged within noise. A7's Landsat improvement comes from training on Landsat data rather than from the flag itself.</p>
          </div>}
        </div>
      </div>
    </section>
  );
}
