import { useEffect, useState } from 'react';
import { SITE } from '../config.js';
const base = `${import.meta.env.BASE_URL}data`;
export const sampleURL = (id, name) => `${base}/samples/${id}/${name}.png`;

export function useData() {
  const [data, setData] = useState(null); const [error, setError] = useState(null);
  useEffect(() => {
    Promise.all([fetch(`${base}/gallery.json`).then((r) => r.json()), fetch(`${base}/results.json`).then((r) => r.json())])
      .then(([gallery, results]) => {
        const gain = (s) => s.metrics.v6.psnr - s.metrics.input.psnr;
        const hero = gallery.samples.find((s) => s.id === SITE.heroId) || gallery.samples.filter((s) => s.cloud_fraction > 0.3).sort((a, b) => gain(b) - gain(a))[0] || gallery.samples[0];
        setData({ gallery, results, hero });
      })
      .catch((e) => setError(e));
  }, []);
  return { data, error };
}
