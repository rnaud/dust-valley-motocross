import { defineConfig } from 'vite';
// One three.js build everywhere: bare 'three' (including three's addons)
// resolves to the WebGPU build, which also provides node materials and TSL.
export default defineConfig({
  base: './',
  resolve: { alias: [{ find: /^three$/, replacement: 'three/webgpu' }] },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  esbuild: { target: 'es2022' },
  optimizeDeps: { esbuildOptions: { target: 'es2022' } }
});
