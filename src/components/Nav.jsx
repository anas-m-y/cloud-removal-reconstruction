import { useEffect, useState } from 'react';
import { scrollToId } from '../lib/motion.js';
import { GlassSurface } from '../bits/Glass.jsx';

const LINKS = [['problem', 'Problem'], ['method', 'Method'], ['playground', 'Playground'], ['try', 'Try your own'], ['results', 'Results'], ['limits', 'Limits']];

export const Mark = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs><linearGradient id="mk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7ff0ff" /><stop offset="1" stopColor="#9b7bff" /></linearGradient></defs>
    <circle cx="12" cy="12" r="10.5" stroke="url(#mk)" strokeWidth="1.5" />
    <path d="M12 1.5v21" stroke="#c9b8ff" strokeWidth="1.5" />
    <path d="M12 6.5a5.5 5.5 0 0 1 0 11" fill="url(#mk)" />
  </svg>
);

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    LINKS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => { window.removeEventListener('scroll', onScroll); io.disconnect(); };
  }, []);
  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`}>
      <GlassSurface className="nav-bar" strength={26} blur={14}>
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); }}><Mark />CLOUDLESS</a>
        <nav className="nav-links" aria-label="Sections">
          {LINKS.map(([id, label]) => (
            <button key={id} className={`${active === id ? 'on' : ''}${id === 'playground' ? ' keep' : ''}`} onClick={() => scrollToId(id)}>{label}</button>
          ))}
        </nav>
      </GlassSurface>
    </header>
  );
}
