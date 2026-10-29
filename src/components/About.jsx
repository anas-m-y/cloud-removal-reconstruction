import { SITE } from '../config.js';

export default function About() {
  return (
    <section className="section" id="about">
      <div className="wrap">
        <h2 className="sr-only">About the project</h2>
        <div className="about">
          <div>
            <h3>Project</h3>
            <p className="title">{SITE.fullTitle}</p>
            <h3>Data</h3>
            <p style={{ maxWidth: '40em' }}>SEN12MS-CR (Sentinel-1 and Sentinel-2), the AllClear benchmark (Sentinel-2, Landsat 8/9 and Sentinel-1), Copernicus and USGS imagery.</p>
          </div>
          <div>
            <h3>Team</h3>
            <ul>{SITE.team.map((t) => <li key={t}>{t}</li>)}</ul>
            <h3>Guide</h3>
            <p>{SITE.guide}</p>
            <p className="muted" style={{ marginTop: 8 }}>{SITE.institution}</p>
            {(SITE.links.code || SITE.links.report) && <p style={{ marginTop: 24, display: 'flex', gap: 24 }}>{SITE.links.code && <a href={SITE.links.code}>Source code</a>}{SITE.links.report && <a href={SITE.links.report}>Project report</a>}</p>}
          </div>
        </div>
        <footer className="footer">
          <div className="big" aria-hidden="true">{SITE.name}</div>
          <div className="small"><span>{SITE.tagline}.</span><span>Capstone project, {SITE.year}.</span></div>
        </footer>
      </div>
    </section>
  );
}
