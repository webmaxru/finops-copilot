import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' keeps asset URLs relative so the built SPA works both at the
// custom-domain root (https://finops.isainative.dev/) and on the GitHub Pages
// project-subpath fallback (https://user.github.io/<repo>/) without hardcoding
// a path. The custom domain itself is pinned by public/CNAME (copied to dist/).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
