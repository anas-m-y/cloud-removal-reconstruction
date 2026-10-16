import { useEffect, useState } from 'react';
import { scrollToId } from '../lib/motion.js';

const LINKS = [['problem', 'Problem'], ['method', 'Method'], ['playground', 'Playground'], ['try', 'Try your own'], ['results', 'Results'], ['limits', 'Limits']];

export const Mark = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10.5" stroke="#72e4ee" strokeWidth="1.5" />
    <path d="M12 1.5v21" stroke="#f2ad4e" strokeWidth="1.5" />
    <path d="M12 6.5a5.5 5.5 0 0 1 0 11" fill="#72e4ee" />
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
      <div className="wrap">
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); }}><Mark />CLOUDLESS</a>
        <nav className="nav-links" aria-label="Sections">
          {LINKS.map(([id, label]) => (
            <button key={id} className={`${active === id ? 'on' : ''}${id === 'playground' ? ' keep' : ''}`} onClick={() => scrollToId(id)}>{label}</button>
          ))}
        </nav>
      </div>
    </header>
  );
}
