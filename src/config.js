// Edit these before you publish.
export const SITE = {
  name: 'CLOUDLESS',
  tagline: 'See the ground through any sky',
  fullTitle: 'GAN-based cloud removal and multi-satellite image reconstruction system using SAR-optical fusion',
  team: ['Anas M Y (23TD0309)', 'Hariharan S (23TD0328)', 'Mohamed Haroon S (23TD0363)'],
  guide: 'Mrs. R. Indumathi, M.Tech., (Ph.D.), Assistant Professor (SG)',
  institution: 'Department of Computer Science and Engineering, Manakula Vinayagar Institute of Technology',
  year: '2026',
  // Scene used by the Problem, Method and Try-your-own sections (any id from public/data/gallery.json).
  // ac-12 is the median-ranked AllClear scene, so the image is typical rather than the best case.
  heroId: 'ac-12',
  // The ten held-out scenes the satellite clears in the hero, left to right, top row first.
  // On phones only the first six are shown.
  heroWall: ['ac-12', 'ls-21', 'ac-13', 'ls-22', 'ac-09', 'ls-18', 'ac-10', 'ls-23', 'ac-15', 'ls-19'],
  links: { code: '', report: '' }, // e.g. 'https://github.com/you/cloud-removal-reconstruction'
};

// Display names for the model versions, as used in the project report. File names keep v5b and v6.
export const NAMES = { v5b: 'A6', v6: 'A7' };
