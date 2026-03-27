export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@vite-pwa/nuxt'],
  css: ['~/assets/css/base.css', '~/assets/css/tokens.css'],
  app: {
    head: {
      title: 'Glean — Remember everything. Organize nothing.',
      meta: [
        { name: 'description', content: 'Remember everything. Organize nothing. Your personal knowledge vault.' },
        { property: 'og:title', content: 'Glean — Remember everything. Organize nothing.' },
        { property: 'og:description', content: 'Remember everything. Organize nothing. Your personal knowledge vault.' },
        { property: 'og:image', content: '/thumbnail.png' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Glean — Remember everything. Organize nothing.' },
        { name: 'twitter:description', content: 'Remember everything. Organize nothing. Your personal knowledge vault.' },
        { name: 'twitter:image', content: '/thumbnail.png' }
      ],
      link: [
        {
          rel: 'apple-touch-icon',
          href: '/icons/pwa-icon-192.png'
        },
        {
          rel: 'preconnect',
          href: 'https://api.fontshare.com'
        },
        {
          rel: 'stylesheet',
          href: 'https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400&display=swap'
        }
      ],
      script: [
        {
          src: 'https://unpkg.com/@phosphor-icons/web',
          defer: true
        }
      ]
    }
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Glean',
      short_name: 'Glean',
      description: 'Save, organize, and find URLs with semantic search.',
      theme_color: '#f5f0ea',
      background_color: '#f5f0ea',
      display: 'standalone',
      orientation: 'portrait',
      lang: 'en',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/icons/pwa-icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/pwa-icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/icons/pwa-icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable'
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
      maximumFileSizeToCacheInBytes: 3000000,
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
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      type: 'module'
    }
  },
  nitro: {
    routeRules: {
      '/login': { ssr: true },
      '/': { ssr: true }
    }
  }
})
