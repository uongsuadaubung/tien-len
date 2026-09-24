import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildTime = Date.now();

const versionGeneratorPlugin = {
  name: 'version-generator',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildTime }, null, 2)
    });
  }
};

// https://vite.dev/config/
export default defineConfig({
  base: '/tien-len/',
  plugins: [react(), versionGeneratorPlugin],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTime)
  },
  worker: {
    format: 'es'
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('dexie')) {
              return 'vendor-dexie';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('canvas-confetti')) {
              return 'vendor-confetti';
            }
            if (id.includes('react') || id.includes('scheduler') || id.includes('zustand')) {
              return 'vendor-core';
            }
            return 'vendor-misc';
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
