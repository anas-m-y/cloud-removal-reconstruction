// Small shared controls: a segmented button group and an on/off switch.
export function Seg({ value, onChange, options, label, disabled }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => <button key={v} aria-pressed={value === v} disabled={disabled} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

export function Switch({ checked, onChange, label, radar, disabled }) {
  return <button className={`switch${radar ? ' radar' : ''}`} role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}
