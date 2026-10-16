# CLOUDLESS

Interactive demo for the final-year project *GAN-based cloud removal and multi-satellite image reconstruction system using SAR-optical fusion*.
React + Vite, GSAP and Lenis for motion, React Bits components (DecryptedText, CountUp, Radar), and ONNX Runtime Web for running v6 in the browser.

## 1. Put the real data in

The repo ships with synthetic stand-in images so it runs out of the box (an orange badge says so).
Run Cell 27 in Colab, download `webapp_export.zip` from Drive, then:

```bash
rm -rf public/data
mkdir public/data
unzip webapp_export.zip -d public/data
```

`public/data` must contain `gallery.json`, `results.json`, `cloudless_v6.onnx` and `samples/`. The badge disappears.

## 2. Edit the names

Open `src/config.js` and fill in the team, guide, institution and links.

## 3. Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
```

## 4. Deploy on Vercel

1. Create a new repository under your **personal** GitHub account (Vercel's free plan cannot connect to repositories owned by an organisation).
2. Push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "CLOUDLESS demo"
   git branch -M main
   git remote add origin https://github.com/<you>/cloudless.git
   git push -u origin main
   ```
3. On vercel.com choose **Add New, Project**, import the repository, keep the detected Vite settings and press **Deploy**.

`vercel.json` sets the cross-origin isolation headers that let the model use several CPU threads. The model file is about 59 MB, below GitHub's 100 MB per-file limit, so Git LFS is not needed.

## Notes

The live model uses WebGPU when the browser offers it and falls back to WebAssembly. The first run downloads the model; later runs are cached by the browser.
React Bits components are used under their MIT + Commons Clause licence (see headers in `src/bits`).
