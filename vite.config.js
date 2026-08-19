import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// RICIPT uses Vite + React.
// SPA routing is handled client-side by react-router-dom.
// `server.historyApiFallback` is only relevant for local dev; Vercel gets its
// rewrite rules from vercel.json, so hard-refreshes on /create, /passes, etc.
// keep working in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Local dev: any unknown path falls back to index.html so react-router
    // can serve routes like /verify?tokenId=123 on refresh.
    historyApiFallback: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});