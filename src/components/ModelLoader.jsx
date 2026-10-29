import { useEffect, useState } from 'react';
import { modelState, onModelState } from '../lib/model.js';

export function useModelState() {
  const [st, setSt] = useState(modelState());
  useEffect(() => onModelState(setSt), []);
  return st;
}

// Shown while the 59 MB model downloads and compiles.
export default function ModelLoader() {
  const st = useModelState();
  if (st.phase === 'ready' || st.phase === 'idle') return null;
  const mb = (b) => (b / 1e6).toFixed(1);
  const p = st.total ? (st.loaded / st.total) * 100 : null;
  return (
    <div className="loader" role="status">
      {st.phase === 'downloading' && <>Downloading the model, <span className="num">{mb(st.loaded)}{st.total ? ` of ${mb(st.total)}` : ''} MB</span>. Only the first run waits for this.</>}
      {st.phase === 'compiling' && 'Preparing the model for this device.'}
      {st.phase === 'error' && <span className="err">{st.error}</span>}
      {st.phase !== 'error' && <div className={`progress${p == null ? ' busy' : ''}`}><i style={p != null ? { width: `${p}%` } : null} /></div>}
    </div>
  );
}
