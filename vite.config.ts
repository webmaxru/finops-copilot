import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' keeps asset URLs relative so the built SPA works on any
// GitHub Pages project subpath (https://user.github.io/<repo>/) without
// hardcoding the repository name.
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
