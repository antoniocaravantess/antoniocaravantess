import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // El repositorio es un "project site", así que la app se sirve bajo /antoniocaravantess/
  base: '/antoniocaravantess/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mi Vida',
        short_name: 'Mi Vida',
        description: 'Controla tus metas, hábitos, tareas, finanzas, trading y bienestar.',
        theme_color: '#0a0a0d',
        background_color: '#0a0a0d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/antoniocaravantess/',
        scope: '/antoniocaravantess/',
        lang: 'es',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Tipografía de Google Fonts (para que se vea también sin conexión)
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cotización de mercado (respaldo, otras monedas)
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|latest\.currency-api\.pages\.dev)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fx-rates',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Tipo de cambio oficial de Banguat publicado en el propio sitio
            urlPattern: /banguat\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'banguat',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 2 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
