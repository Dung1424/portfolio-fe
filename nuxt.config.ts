// https://nuxt.com/docs/api/configuration/nuxt-config
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@ant-design-vue/nuxt'
  ],

  /** Bật SSR cho SEO; khu vực chỉ-client (auth + dashboard) tắt SSR qua routeRules */
  ssr: true,

  components: [
    /** Bắt buộc: auto-import `~/components` (AdminModal, AdminPager, …) */
    { path: '~/components', pathPrefix: false },
    { path: '~/features/auth/components', pathPrefix: false },
    { path: '~/features/home/components', pathPrefix: false },
    { path: '~/features/category/components', pathPrefix: false },
    {
      path: '~/features/account/components',
      pathPrefix: false,
      ignore: ['**/photos/**', '**/galleries/**', '**/profile/**', '**/likes/**']
    },
    { path: '~/features/account/components/photos', pathPrefix: false },
    { path: '~/features/account/components/galleries', pathPrefix: false },
    { path: '~/features/account/components/profile', pathPrefix: false },
    { path: '~/features/account/components/likes', pathPrefix: false },
    { path: '~/features/photo/components', pathPrefix: false },
    { path: '~/features/gallery/components', pathPrefix: false },
    { path: '~/features/blog/components', pathPrefix: false },
    { path: '~/features/contact/components', pathPrefix: false },
    { path: '~/features/search/components', pathPrefix: false },
    { path: '~/features/chat/components', pathPrefix: false },
    { path: '~/features/profile/components', pathPrefix: false },
    { path: '~/features/booking/components', pathPrefix: false },
    { path: '~/features/hotel/components', pathPrefix: false }
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000',
      /** Chat (Node). Mặc định trùng apiBase khi dùng portfolio-gateway (một origin). */
      chatApi:
        process.env.NUXT_PUBLIC_CHAT_API
        || process.env.NUXT_PUBLIC_API_BASE
        || 'http://localhost:3010',
      webRtcIceServers:
        process.env.NUXT_PUBLIC_WEBRTC_ICE_SERVERS
        || '[{"urls":"stun:stun.l.google.com:19302"}]',
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'MyPortfolio',
      siteDescription:
        process.env.NUXT_PUBLIC_SITE_DESCRIPTION
        || 'Discover photography, galleries, and photographers.',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || ''
    }
  },

  // Root-level app (app.vue, pages/, …) instead of Nuxt 4 default `app/` subfolder
  dir: {
    app: '.'
  },

  alias: {
    '@assets': resolve(__dirname, 'public/front_assets'),
    '@features': resolve(__dirname, 'features')
  },

  routeRules: {
    '/login': { ssr: false },
    '/register': { ssr: false },
    '/forgot-password': { ssr: false },
    '/account': { ssr: false },
    '/account/**': { ssr: false },
    '/myPhotos': { ssr: false },
    '/myGallery': { ssr: false },
    '/addPhotos': { ssr: false },
    '/changePassword': { ssr: false },
    '/like': { ssr: false },
    '/chat': { ssr: false },
    '/listUserBlock': { ssr: false },
    '/galleryDetails/**': { ssr: false },
    '/admin': { ssr: false },
    '/admin/**': { ssr: false }
  },

  compatibilityDate: '2025-01-15',

  vite: {
    plugins: [tailwindcss()]
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
