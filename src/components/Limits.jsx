export default function Limits({ results }) {
  const c = results.composite.ac, cl = results.composite.ls, s77 = results.real.spring_by_scene['77'], ab = results.ablation;
  const items = [
    ['A flat colour fill still wins on PSNR', `On cloud pixels, painting the mean colour of the visible clear pixels scores ${c.cloud_db.fill} dB on Sentinel-2 against A7's ${c.cloud_db.v6} dB (Landsat: ${cl.cloud_db.fill} vs ${cl.cloud_db.v6}). PSNR rewards smooth guesses; A7 puts texture back, which SSIM and the images reflect better.`],
    ['Colour drift on some terrain', `Red soil comes out greyer than it is. In spring scene 77, PSNR rose to ${s77.psnr_v6.toFixed(1)} dB but SSIM slipped from ${s77.ssim_v5b.toFixed(3)} (A6) to ${s77.ssim_v6.toFixed(3)}.`],
    ['It can invent detail', 'In some Landsat scenes A7 draws small bright structures that are not on the ground; two of the Landsat scenes in the playground show it. A GAN produces plausible pixels, not measured ones.'],
    ['Targets come from another date', 'Real cloudy and clear images are days apart, so part of every error is genuine change on the ground. The composite test, with real cloud pasted on a same-day clear image, is the fairer measure.'],
    ['The satellite flag mostly helps Sentinel-2', ab ? `Swapping the flag costs ${ab.ac.sar_on.diff.toFixed(2)} ± ${ab.ac.sar_on.se.toFixed(2)} dB on Sentinel-2 but ${ab.ls.sar_on.diff.toFixed(2)} ± ${ab.ls.sar_on.se.toFixed(2)} dB on Landsat. The Landsat gain comes from training on Landsat data, not from the flag.` : 'Not yet measured.'],
    ['Uploads are approximate', 'Screenshots and photos are not calibrated reflectance and come without radar, so the in-browser tool runs the no-radar mode on an estimate of the input.'],
  ];
  return (
    <section className="section field" id="limits">
      <div className="wrap">
        <div className="sec-head">
          <h2>What it gets wrong</h2>
          <p>Known weaknesses, measured on the same held-out data as the results above.</p>
        </div>
        <ul className="issues">
          {items.map(([h, p]) => <li key={h}><h3>{h}</h3><p>{p}</p></li>)}
          <li className="future"><h3>Next: ISRO LISS-IV</h3><p>Resourcesat LISS-IV imagery through Bhoonidhi, once data access is approved, would make the multi-satellite claim Indian-sensor first.</p></li>
          <li className="future"><h3>Next: full scenes</h3><p>Tiling with overlap, so whole satellite scenes can be processed rather than 256 × 256 patches.</p></li>
        </ul>
      </div>
    </section>
  );
}
