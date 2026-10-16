import { useEffect, useState } from 'react';
import Radar from '../bits/Radar.jsx';
import { modelState, onModelState } from '../lib/model.js';

export function useModelState() {
  const [st, setSt] = useState(modelState());
  useEffect(() => onModelState(setSt), []);
  return st;
}

// Shown while the 59 MB model downloads and compiles.
export default function ModelLoader({ compact }) {
  const st = useModelState();
  if (st.phase === 'ready' || st.phase === 'idle') return null;
  const mb = (b) => (b / 1e6).toFixed(1);
  const p = st.total ? (st.loaded / st.total) * 100 : null;
  return (
    <div className="loader" role="status" style={compact ? { gridTemplateColumns: '56px 1fr', padding: 10 } : null}>
      <div className="radar-box" style={compact ? { width: 56, height: 56 } : null}>
        <Radar color="#f2ad4e" backgroundColor="#0a1828" ringCount={4} spokeCount={8} targets={3} mouseInteraction={false} grain={0} />
      </div>
      <div>
        {st.phase === 'downloading' && <>Downloading the model, <span className="num">{mb(st.loaded)}{st.total ? ` of ${mb(st.total)}` : ''} MB</span>. Only the first run waits for this.</>}
        {st.phase === 'compiling' && 'Preparing the model for this device.'}
        {st.phase === 'error' && <span className="err">{st.error}</span>}
        {st.phase === 'downloading' && <div className="progress"><i style={{ width: p != null ? `${p}%` : '30%' }} /></div>}
      </div>
    </div>
  );
}
