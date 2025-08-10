import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,  // Evita que Vite cambie el puerto si 5173 está ocupado
  },
  build: {
    outDir: 'dist/renderer',  // Carpeta de salida para el build
    emptyOutDir: true,        // Limpia el directorio antes de cada build
    sourcemap: true,          // Genera source maps para depuración
  },
  base: './',  // Ruta base para assets (importante para Electron)
});