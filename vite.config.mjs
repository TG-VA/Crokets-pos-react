import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CSP estricta para el build de producción (Electron carga file:// y no tiene headers).
// En dev no se inyecta para no romper el HMR de Vite.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

const injectCspOnBuild = () => ({
  name: 'inject-csp-on-build',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`
    );
  }
});

export default defineConfig({
  // Rutas relativas: Electron carga el build con file:// y las rutas absolutas
  // (/assets/...) resolvían a file:///assets/... (KNOWN_ISSUES #36).
  base: './',
  plugins: [react(), injectCspOnBuild()],
  server: {
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          spreadsheets: ['exceljs', 'xlsx']
        }
      }
    }
  }
});
