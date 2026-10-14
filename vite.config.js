import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Green System – USCAEP',
        short_name: 'Green System',
        description: 'Gestion des coopératives, approvisionnements et commandes',
        lang: 'fr',
        theme_color: '#1E4D36',
        background_color: '#F2F4F0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Seul le sous-ensemble latin de la police est conservé hors-ligne (le français n'a pas besoin des autres).
        globIgnores: ['**/*cyrillic*', '**/*vietnamese*', '**/*latin-ext*']
      }
    })
  ],
  server: { proxy: { '/api': 'http://localhost:3001' } }
});
