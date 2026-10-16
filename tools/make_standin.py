"""Stand-in data with the same schema as the Colab export (Cell 27), for building the UI before the real export arrives.
Images are synthetic; results.json holds the real evaluation numbers from Cells 25-26."""
import os, sys, json, shutil, numpy as np
from PIL import Image
import matplotlib.cm as cm
from scipy.ndimage import gaussian_filter
OUT = sys.argv[1]; ONNX = sys.argv[2] if len(sys.argv) > 2 else None
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(f'{OUT}/samples')
rng = np.random.default_rng(3)
def fbm(n=256, oct=6):
    a = np.zeros((n, n))
    for o in range(oct): a += gaussian_filter(rng.standard_normal((n, n)), 64 / 2 ** o, mode='wrap') * (0.55 ** o) * 2 ** (o * 0.6)
    return (a - a.min()) / (a.max() - a.min())
pal = {'sp': [(0.20, 0.17, 0.12), (0.30, 0.22, 0.14), (0.14, 0.16, 0.10)], 'ac': [(0.05, 0.08, 0.06), (0.08, 0.11, 0.07), (0.10, 0.10, 0.09)],
       'ls': [(0.09, 0.09, 0.10), (0.07, 0.09, 0.07), (0.12, 0.11, 0.11)]}
def terrain(tag):
    h, f = fbm(), fbm(oct=4); cs = np.array(pal[tag])
    img = cs[0][:, None, None] * (1 - h) + cs[1][:, None, None] * h
    img = img * (1 - 0.6 * (f > 0.62)) + cs[2][:, None, None] * 0.6 * (f > 0.62)
    road = np.abs(np.arange(256)[None, :] - (100 + 40 * np.sin(np.arange(256)[:, None] / 40))) < 1.5
    img = np.where(road[None], 0.32, img)
    return np.clip(img * (0.9 + 0.2 * fbm(oct=7)), 0, 1).astype(np.float32)
def clouds():
    c = fbm(oct=6); m = np.clip((c - 0.45) * 4, 0, 1); return m, m > 0.35
def enc(x): return (np.sqrt(np.clip(x, 0, 1)) * 255).round().astype(np.uint8)
def save(a, p): Image.fromarray(np.ascontiguousarray(enc(a).transpose(1, 2, 0))).save(p)
def psnr(a, t): return float(10 * np.log10(1 / ((a - t) ** 2).mean()))
names = {'sp': 'Sentinel-2 (SEN12MS-CR spring)', 'ac': 'Sentinel-2 (AllClear)', 'ls': 'Landsat 8/9 (AllClear)'}
samples = []; i = 0
for tag, n in (('sp', 8), ('ac', 8), ('ls', 8)):
    for j in range(n):
        t = terrain(tag); a, m = clouds()
        c = t * (1 - a) + 0.55 * a + 0.04 * a * fbm()
        blur = lambda x, s: np.stack([gaussian_filter(ch, s) for ch in x])
        v = {'input': c, 'target': t, 'v6': np.where(m, blur(t, 1.4) * 1.03, t * 0.98 + 0.01),
             'v5b': np.where(m, blur(t, 3) * 0.85 + 0.02, t * 0.95)}
        v['v6_nosar'] = np.where(m, blur(t, 2.2), v['v6']); v['v6_wrongflag'] = v['v6'] * np.array([1.05, 1, 0.95])[:, None, None]
        v['v6_nosar_wrongflag'] = v['v6_nosar'] * np.array([1.05, 1, 0.95])[:, None, None]
        sid = f'{tag}-{i:02d}'; d = f'{OUT}/samples/{sid}'; os.makedirs(d)
        for k, x in v.items(): save(x, f'{d}/{k}.png')
        vv = np.clip(0.3 + 0.5 * fbm() + 0.15 * rng.standard_normal((256, 256)), 0, 1); vh = np.clip(vv * 0.7 + 0.1 * rng.standard_normal((256, 256)), 0, 1)
        Image.fromarray((np.stack([vv, vh, np.clip(vv - vh + 0.3, 0, 1)], -1) * 255).astype(np.uint8)).save(f'{d}/sar.png')
        db = lambda x: ((x * 25 - 25 + 35) / 40 * 255).round().astype(np.uint8)
        Image.fromarray(np.stack([db(vv), db(vh), np.zeros_like(db(vv))], -1)).save(f'{d}/sar_raw.png')
        if tag != 'sp': Image.fromarray((m * 255).astype(np.uint8)).save(f'{d}/mask.png')
        sd = gaussian_filter(a, 3) * 0.8 + 0.2 * fbm()
        Image.fromarray((cm.inferno(sd)[..., :3] * 255).astype(np.uint8)).save(f'{d}/conf.png')
        met = {k: {'psnr': psnr(x, t), 'ssim': 0.8} for k, x in v.items() if k != 'target'}
        samples.append(dict(id=sid, src=tag, source=names[tag], sensor='Landsat' if tag == 'ls' else 'Sentinel-2', key=f'standin_{i}',
                            scene=['66', '66', '66', '75', '75', '75', '77', '77'][j] if tag == 'sp' else None, rank_quantile=round(0.06 + j * 0.88 / 7, 2),
                            cloud_fraction=float(m.mean()), has_mask=tag != 'sp', target_note='clear image of the same place on another date',
                            metrics=met, uncertainty_mean=float(sd.mean() * 0.05)))
        i += 1
json.dump(dict(samples=samples, uncertainty_scale=0.05, sar_range_db=[-35, 5], standin=True), open(f'{OUT}/gallery.json', 'w'), indent=1)
R = lambda n, a, b, c, d, e, f: dict(n=n, psnr_in=a, psnr_v5b=b, psnr_v6=c, ssim_in=d, ssim_v5b=e, ssim_v6=f)
res = {'real': {'spring_by_scene': {'66': R(200, 15.019, 14.865, 23.034, .741, .715, .815), '75': R(200, 11.593, 36.101, 36.894, .462, .931, .937),
                                    '77': R(200, 15.296, 23.48, 25.184, .634, .794, .783)},
                'spring_all': R(600, 13.969, 24.815, 28.371, .612, .813, .845),
                'ac': R(452, 18.745, 30.306, 31.789, .748, .882, .889), 'ls': R(445, 17.169, 28.988, 30.755, .712, .868, .89)}}
K = ['input', 'fill', 'v5b', 'v6', 'v6_nosar', 'v5b_paste', 'v6_paste']
comp = lambda n, cf, cl, im, ss, clr, b, f, s: dict(n=n, cloud_fraction=cf, cloud_db=dict(zip(K, cl)), image_db=dict(zip(K, im)),
    ssim=dict(zip(['input', 'v5b', 'v6'], ss)), clear_db=dict(v5b=clr[0], v6=clr[1]), v6_beats_v5b=b, v6_beats_fill=f, sar_helps=s)
res['composite'] = {'ac': comp(452, .41, [14.92, 35.37, 29.80, 31.40, 30.69, 29.8, 31.4], [19.52, 39.97, 30.57, 32.46, 31.89, 34.4, 36.0], [.782, .893, .903], [31.34, 33.57], .68, .17, .62),
                    'ls': comp(445, .43, [13.52, 35.96, 28.64, 30.18, 29.60, 28.64, 30.18], [17.84, 40.27, 29.37, 31.40, 31.04, 32.96, 34.49], [.756, .881, .901], [30.29, 32.73], .66, .10, .61)}
ab = lambda n, oc, on, off: dict(n=n, out_change_255=oc, sar_on=dict(zip(['correct', 'wrong', 'diff', 'se', 'win'], on)), sar_off=dict(zip(['correct', 'wrong', 'diff', 'se', 'win'], off)))
res['ablation'] = {'ac': ab(200, 3.36, [31.67, 30.28, 1.40, .19, .72], [31.20, 29.15, 2.06, .22, .74]),
                   'ls': ab(200, 3.53, [30.86, 31.00, -0.13, .21, .48], [30.09, 30.14, -0.05, .25, .52])}
json.dump(res, open(f'{OUT}/results.json', 'w'), indent=1)
if ONNX: shutil.copy(ONNX, f'{OUT}/cloudless_v6.onnx')
print('stand-in written', len(samples))
