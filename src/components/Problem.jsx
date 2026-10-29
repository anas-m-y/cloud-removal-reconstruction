import { sampleURL } from '../lib/data.js';
import { NAMES } from '../config.js';

export default function Problem({ hero }) {
  const m = hero.metrics;
  return (
    <section className="section" id="problem">
      <div className="wrap">
        <div className="sec-head">
          <h2>Optical satellites cannot see through cloud. Radar can.</h2>
          <p>
            About two-thirds of Earth is under cloud at any moment, according to <a href="https://www.nasa.gov/image-article/cloudy-earth" target="_blank" rel="noreferrer">NASA</a>.
            For crop monitoring, flood mapping and disaster response, that means the image you need is often the one that is blocked.
          </p>
          <p>The ISRO Bharatiya Antariksh Hackathon 2026 asked for cloud removal. We added a harder requirement: one model that works across satellites.</p>
        </div>
        <div className="plates">
          <figure>
            <img src={sampleURL(hero.id, 'input')} alt="Cloudy optical image" loading="lazy" />
            <figcaption><strong>What the optical sensor recorded</strong><span>{hero.source}, {Math.round(hero.cloud_fraction * 100)}% cloud. Cloud and its shadow hide the ground.</span></figcaption>
          </figure>
          <figure>
            <img className="radar-img" src={sampleURL(hero.id, 'sar_raw')} alt="Sentinel-1 radar image of the same place" loading="lazy" />
            <figcaption><strong>What Sentinel-1 radar recorded</strong><span>Microwaves pass through cloud, so field boundaries and structure are still there, without natural colour.</span></figcaption>
          </figure>
          <figure>
            <img src={sampleURL(hero.id, 'v6')} alt={`The same scene rebuilt by ${NAMES.v6}`} loading="lazy" />
            <figcaption><strong>What {NAMES.v6} rebuilt from both</strong><span>{m.input.psnr.toFixed(1)} dB for the cloudy input, {m.v6.psnr.toFixed(1)} dB after, against a clear image of another date.</span></figcaption>
          </figure>
        </div>
        <div className="facts">
          <div><h3>Radar keeps the structure</h3><p>Sentinel-1 C-band radar images the surface day or night, through cloud. It gives shape and texture but no natural colour.</p></div>
          <div><h3>Optical keeps the colour</h3><p>The clear parts of the cloudy image and the model's learned priors supply colour. The GAN fuses both into one plausible clear image.</p></div>
          <div><h3>One model, two satellites</h3><p>{NAMES.v6} is fine-tuned on Sentinel-2 and Landsat 8/9 together, with a sensor flag and a radar-present flag it can condition on.</p></div>
        </div>
      </div>
    </section>
  );
}
