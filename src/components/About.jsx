import { SITE } from '../config.js';
import { Mark } from './Nav.jsx';

export default function About() {
  return (
    <section className="section" id="about">
      <div className="wrap">
        <div className="about">
          <div>
            <h3>Project</h3>
            <p style={{ fontSize: 20, fontFamily: 'var(--display)', fontWeight: 500, maxWidth: '34ch' }}>{SITE.fullTitle}</p>
            <h3>Data</h3>
            <p style={{ color: 'var(--muted)', maxWidth: '60ch' }}>SEN12MS-CR (Sentinel-1 and Sentinel-2), the AllClear benchmark (Sentinel-2, Landsat 8/9 and Sentinel-1), Copernicus and USGS imagery.</p>
          </div>
          <div>
            <h3>Team</h3>
            <ul>{SITE.team.map((t) => <li key={t}>{t}</li>)}</ul>
            <h3>Guide</h3>
            <p>{SITE.guide}</p>
            <p style={{ color: 'var(--muted)' }}>{SITE.institution}</p>
            {(SITE.links.code || SITE.links.report) && <p>{SITE.links.code && <a href={SITE.links.code}>Source code</a>}{SITE.links.code && SITE.links.report && '  '}{SITE.links.report && <a href={SITE.links.report}>Project report</a>}</p>}
          </div>
        </div>
        <footer className="footer">
          <span className="brand" style={{ fontSize: 14 }}><Mark />CLOUDLESS</span>
          <span>Final-year project, {SITE.year}. Animated text and radar from React Bits.</span>
        </footer>
      </div>
    </section>
  );
}
