import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.svg'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2,json}'] },
      manifest: {
        name: 'Typeverse',
        short_name: 'Typeverse',
        description: 'A free typing arcade with 8 game modes.',
        theme_color: '#FFF4E0',
        background_color: '#FFF4E0',
        display: 'standalone',
        icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~content': fileURLToPath(new URL('./content', import.meta.url)),
    },
  },
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      reporter: ['text'],
      // Engine and scoring must stay above 80% (NFR-12). Canvas/DOM adapters
      // are covered by the Playwright smoke tests instead.
      include: [
        'src/engine/**',
        'src/modes/shared/scoring.ts',
        'src/modes/shared/difficulty.ts',
        'src/modes/shared/ObjectPool.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
  },
});
