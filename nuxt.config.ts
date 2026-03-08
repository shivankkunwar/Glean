export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt'],
  css: ['~/assets/css/base.css', '~/assets/css/tokens.css'],
  app: {
    head: {
      title: 'Glean'
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Glean',
      short_name: 'Glean',
      description: 'Save, organize, and find URLs with semantic search.',
      theme_color: '#f6f2ff',
      background_color: '#f4f7ff',
      display: 'standalone',
      orientation: 'portrait',
      lang: 'en',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/icons/pwa-icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any'
        }
      ],
      share_target: {
        action: '/api/share',
        method: 'POST',
        enctype: 'application/x-www-form-urlencoded',
        params: {
          title: 'title',
          text: 'text',
          url: 'url'
        }
      }
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,ico,png,svg,webmanifest}'],
      runtimeCaching: [
        {
          urlPattern: /\/api\//,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'glean-api',
            networkTimeoutSeconds: 5,
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          urlPattern: /\/(?:_nuxt|_npm|icons|.*\.(?:css|js|woff2|png|jpg|jpeg|svg|webp))/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'glean-static',
            expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 }
          }
        }
      ]
    }
  },
  nitro: {
    routeRules: {
      '/login': { ssr: true },
      '/': { ssr: true }
    }
  }
})
