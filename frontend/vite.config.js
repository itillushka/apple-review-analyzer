import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static SPA. In dev we proxy /api/* to the backend (mirrors the prod nginx setup),
// so the app can fetch("/api/...") identically in dev and production.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8100',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
