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
        { name: 'theme-color', content: '#f5f0ea' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'Glean' },
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
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/pwa-icon-192.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icons/pwa-icon-512.png' },
        { rel: 'apple-touch-icon', href: '/icons/pwa-icon-192.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        {
          rel: 'preconnect',
          href: 'https://api.fontshare.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous'
        },
        {
          rel: 'stylesheet',
          href: 'https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400&display=swap'
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300;1,9..40,400;1,9..40,500&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap'
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
    manifestFilename: 'manifest.webmanifest',
    includeAssets: ['favicon.ico', 'icons/pwa-icon-144.png', 'icons/pwa-icon-512.png', 'screenshots/*.png'],
    workbox: {
      maximumFileSizeToCacheInBytes: 3000000,
      navigateFallback: undefined,
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
          urlPattern: /\/(?:_nuxt|_npm|icons|screenshots|.*\.(?:css|js|woff2|png|jpg|jpeg|svg|webp))/,
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
    },
    client: {
      registerPlugin: true,
      installPrompt: true
    }
  },
  nitro: {
    routeRules: {
      '/login': { ssr: true },
      '/': { ssr: true }
    }
  }
})