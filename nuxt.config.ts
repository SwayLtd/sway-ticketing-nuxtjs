// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  runtimeConfig: {
    stripe: {
      key: process.env.STRIPE_SECRET_KEY,
      options: {},
    },
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    public: {
      BASE_URL: process.env.BASE_URL,
      stripe: {
        key: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        options: {},
      },
      SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@unlok-co/nuxt-stripe',
    '@nuxtjs/supabase'
  ],

  // https://github.com/supabase/supabase/issues/16551
  // Désactive la redirection automatique par Supabase
  supabase: {
    redirect: false,
    // Si vous préférez personnaliser la redirection, vous pouvez utiliser redirectOptions :
    // redirectOptions: {
    //   login: '/login',
    //   callback: '/confirm',
    //   exclude: ['/', '/index']
    // }
  },

  // Configuration HTTPS pour le développement (requis pour la caméra sur mobile)
  // Configuré via la variable d'environnement NUXT_DEV_HTTPS
  ...(process.env.NUXT_DEV_HTTPS === 'true' ? {
    devServer: {
      https: {
        key: './server.key',
        cert: './server.crt'
      }
    }
  } : {}),

  // Nitro configuration - adaptable selon l'environnement
  nitro: {
    preset: process.env.NETLIFY ? 'netlify' : 'node-server',
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Force la fermeture propre du processus
    minify: process.env.NODE_ENV === 'production',
    // Résout les problèmes de build qui ne se terminent pas
    legacyExternals: true,
    // Force l'arrêt des processus en arrière-plan
    close: true,
    // Désactive les watchers qui peuvent rester actifs
    devProxy: false,
    // Configuration plus agressive pour forcer la fermeture
    timing: false,
    experimental: {
      wasm: false
    }
  },

  // Force SSR mode, no static generation
  ssr: true,

  vite: {
    build: {
      sourcemap: false
    }
  }
});
