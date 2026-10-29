import { useEffect, useState } from 'react';
import { scrollToId } from '../lib/motion.js';

const LINKS = [['problem', 'Problem'], ['method', 'Method'], ['try', 'Try your own'], ['results', 'Results'], ['limits', 'Limits']];

// A plain bar: wordmark, a few links, one action.
export default function Nav() {
  const [active, setActive] = useState('');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    [...LINKS.map(([id]) => id), 'playground'].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <header className="nav">
      <div className="nav-bar">
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); }}>CLOUDLESS</a>
        <nav className="nav-links" aria-label="Sections">
          {LINKS.map(([id, label]) => (
            <button key={id} aria-current={active === id ? 'true' : undefined} onClick={() => scrollToId(id)}>{label}</button>
          ))}
        </nav>
        <button className="btn primary small" onClick={() => scrollToId('playground')}>Open the playground</button>
      </div>
    </header>
  );
}
