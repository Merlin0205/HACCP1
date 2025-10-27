import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tento konfigurační soubor zajišťuje správné fungování Vite, 
// včetně nastavení serveru a proxy pro komunikaci s backendem.
// Důležité je, že automaticky zpřístupňuje všechny proměnné z .env souboru,
// které začínají na VITE_, do frontendové části aplikace přes `import.meta.env`.

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:9002',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
