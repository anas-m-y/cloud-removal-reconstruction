import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cross-origin isolation lets ONNX Runtime use several CPU threads when WebGPU is unavailable.
const isolation = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };
export default defineConfig({
  plugins: [react()],
  server: { headers: isolation },
  preview: { headers: isolation },
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  build: { chunkSizeWarningLimit: 1200 },
});
