import { useEffect, useRef, useState } from 'react';

function useWidth() {
  const ref = useRef(null); const [w, setW] = useState(720);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(ref.current); return () => ro.disconnect();
  }, []);
  return [ref, w];
}
const ticks = (lo, hi, n = 4) => { const step = (hi - lo) / n; return Array.from({ length: n + 1 }, (_, i) => lo + i * step); };

function Tip({ tip }) {
  if (!tip) return null;
  return <div className="tip" style={{ left: tip.x, top: tip.y }}>{tip.content}</div>;
}

/** Grouped vertical bars. groups: [{ label, values: { key: number } }], series: [{ key, label, color }] */
export function GroupedBars({ groups, series, max, unit, fmt = (v) => v.toFixed(1), height = 320, refLine, labelKey }) {
  const [ref, W] = useWidth(); const [tip, setTip] = useState(null);
  const m = { t: 24, r: 8, b: 46, l: 40 }, H = height, iw = W - m.l - m.r, ih = H - m.t - m.b;
  const gw = iw / groups.length, pad = Math.min(28, gw * 0.22), bw = Math.max(6, (gw - pad - 2 * (series.length - 1)) / series.length);
  const y = (v) => m.t + ih - (v / max) * ih;
  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label={`Bar chart in ${unit}`}>
        <g className="grid axis">{ticks(0, max).map((t) => <g key={t}><line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} /><text x={m.l - 8} y={y(t) + 4} textAnchor="end">{Math.round(t)}</text></g>)}</g>
        {groups.map((g, gi) => {
          const x0 = m.l + gi * gw + pad / 2;
          return (
            <g key={g.label}>
              {series.map((s, si) => {
                const v = g.values[s.key]; if (v == null) return null;
                const x = x0 + si * (bw + 2), top = y(v), h = m.t + ih - top, r = Math.min(2, bw / 2, h);
                return (
                  <g key={s.key}>
                    <path d={`M${x},${m.t + ih} V${top + r} q0,-${r} ${r},-${r} H${x + bw - r} q${r},0 ${r},${r} V${m.t + ih} Z`} fill={s.color} opacity={s.alpha ?? 1} />
                    {s.key === labelKey && bw >= 18 && <text className="val" x={x + bw / 2} y={top - 6} textAnchor="middle">{fmt(v)}</text>}
                    <rect className="hit" x={x - 1} y={m.t} width={bw + 2} height={ih}
                      onPointerEnter={() => setTip({ x: x + bw / 2, y: top, content: <><b>{g.label}</b><br />{s.label}: <span className="num">{fmt(v)} {unit}</span></> })}
                      onPointerLeave={() => setTip(null)} />
                  </g>
                );
              })}
              <text className="cat" x={x0 + (gw - pad) / 2} y={H - m.b + 20} textAnchor="middle">{g.label}</text>
              {g.sub && <text className="lab" x={x0 + (gw - pad) / 2} y={H - m.b + 37} textAnchor="middle">{g.sub}</text>}
              {refLine && g.ref != null && (
                <g><line x1={x0 - 4} x2={x0 + gw - pad + 4} y1={y(g.ref)} y2={y(g.ref)} stroke="#9aa09c" strokeWidth="1.5" strokeDasharray="5 4" />
                  <text className="lab" x={x0 + gw - pad + 4} y={y(g.ref) - 6} textAnchor="end">{refLine} {fmt(g.ref)}</text></g>
              )}
            </g>
          );
        })}
        <line x1={m.l} x2={W - m.r} y1={m.t + ih} y2={m.t + ih} stroke="#3a4146" />
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

/** Horizontal dot plot with ±1.96 s.e. intervals around a zero line. rows: [{ label, diff, se, win }] */
export function DiffDots({ rows, color, unit = 'dB' }) {
  const [ref, W] = useWidth(); const [tip, setTip] = useState(null);
  const narrow = W < 560;
  const m = { t: 30, r: narrow ? 46 : 24, b: 34, l: narrow ? 158 : 230 }, rowH = 46, H = m.t + m.b + rows.length * rowH;
  const lo = Math.min(-0.8, ...rows.map((r) => r.diff - 2 * r.se)), hi = Math.max(2.6, ...rows.map((r) => r.diff + 2 * r.se));
  const x = (v) => m.l + ((v - lo) / (hi - lo)) * (W - m.l - m.r);
  return (
    <div className="chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label="Dot plot of PSNR lost when the satellite flag is swapped">
        <g className="grid axis">{ticks(Math.ceil(lo * 2) / 2, Math.floor(hi * 2) / 2, Math.round((Math.floor(hi * 2) - Math.ceil(lo * 2)) / 1)).filter((_, i, a) => a.length < 9 || i % 2 === 0).map((t) => (
          <g key={t}><line x1={x(t)} x2={x(t)} y1={m.t - 8} y2={H - m.b} /><text x={x(t)} y={H - m.b + 18} textAnchor="middle">{t > 0 ? '+' : ''}{t.toFixed(1)}</text></g>
        ))}</g>
        <line x1={x(0)} x2={x(0)} y1={m.t - 12} y2={H - m.b} stroke="#edeeea" strokeWidth="1.5" />
        <text className="lab" x={x(0) + 6} y={m.t - 14}>no effect</text>
        {rows.map((r, i) => {
          const cy = m.t + i * rowH + rowH / 2;
          return (
            <g key={r.label}>
              <text className="cat" x={m.l - 14} y={cy + 5} textAnchor="end">{r.label}</text>
              <line x1={x(r.diff - 1.96 * r.se)} x2={x(r.diff + 1.96 * r.se)} y1={cy} y2={cy} stroke={color} strokeWidth="2" strokeLinecap="round" />
              <circle cx={x(r.diff)} cy={cy} r="6" fill={color} stroke="#0c0e0f" strokeWidth="2" />
              <text className="val" x={x(r.diff + 1.96 * r.se) + 8} y={cy + 4}>{r.diff > 0 ? '+' : ''}{r.diff.toFixed(2)}</text>
              <rect className="hit" x={m.l} y={cy - rowH / 2} width={W - m.l - m.r} height={rowH}
                onPointerEnter={() => setTip({ x: x(r.diff), y: cy - 8, content: <><b>{r.label}</b><br />Correct flag better by <span className="num">{r.diff.toFixed(2)} ± {(1.96 * r.se).toFixed(2)} {unit}</span><br />Correct flag wins in <span className="num">{Math.round(r.win * 100)}%</span> of scenes</> })}
                onPointerLeave={() => setTip(null)} />
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

export function DataTable({ head, rows }) {
  return (
    <table className="data"><thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => i === 0 ? <th key={i} scope="row" style={{ textAlign: 'left', color: 'var(--text)', fontWeight: 400 }}>{c}</th> : <td key={i}>{c}</td>)}</tr>)}</tbody></table>
  );
}
