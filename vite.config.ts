import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

// Načíst verzi z package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version || '0.0.0';
const buildDate = new Date().toISOString().split('T')[0];

// Tento konfigurační soubor zajišťuje správné fungování Vite, 
// včetně nastavení serveru a proxy pro komunikaci s backendem.
// Důležité je, že automaticky zpřístupňuje všechny proměnné z .env souboru,
// které začínají na VITE_, do frontendové části aplikace přes `import.meta.env`.

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Proxy odstraněno - používáme Firebase místo Express serveru
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildDate),
    // Make Buffer available globally for @react-pdf/renderer
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
});
