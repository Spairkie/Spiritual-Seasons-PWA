import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Base '/' keeps GitHub Pages / Netlify project-root deploys simple; the app
// only ever runs at the origin root, so no need for relative-base juggling.
export default defineConfig({
  base: '/',
  resolve: {
    // Mirrors the "@/*": ["src/*"] path mapping in tsconfig.app.json —
    // tsc only type-checks paths, it doesn't rewrite them, so Vite/Vitest
    // need this too or the alias resolves at typecheck time but not at run time.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    preact(),
    tailwindcss(),
    VitePWA({
      // generateSW's bundled Workbox runtime fails ServiceWorker script
      // evaluation outright under this project's Vite 8 toolchain (isolated
      // and confirmed via a hand-written minimal SW that installs/caches
      // fine in the same environment — see PROGRESS.md). injectManifest
      // uses our own src/sw.ts instead, with only the precache file list
      // injected at build time.
      strategies: 'injectManifest',
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}']
      },
      includeAssets: ['assets/icons/*.svg', 'assets/images/*.webp'],
      manifest: false // we ship a hand-written manifest.webmanifest in public/
    })
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Keep the PDF export path (jsPDF) out of the main bundle — it's
        // only needed when someone actually exports a PDF.
        manualChunks(id: string): string | undefined {
          if (id.includes('jspdf')) return 'jspdf';
          return undefined;
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts']
  }
});
