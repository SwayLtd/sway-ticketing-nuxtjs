// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  css: ["~/assets/app.css"],

  runtimeConfig: {
    stripe: {
      key: process.env.STRIPE_SECRET_KEY,
      options: {},
    },
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    public: {
      BASE_URL: process.env.BASE_URL,
      PROD_BASE_URL: process.env.PROD_BASE_URL, // Ajouté pour Sway Tickets
      TEST_BASE_URL: process.env.TEST_BASE_URL, // Ajouté pour Sway Tickets
      stripe: {
        key: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        options: {},
      },
      SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  }, modules: [
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@unlok-co/nuxt-stripe',
    '@nuxtjs/supabase',
    '@nuxt/eslint'
  ],

  image: {
    provider: "netlify",
    domains: ["test.sway.events", "sway.events"],
  },

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
  } : {}),  // Nitro configuration - adaptable selon l'environnement
  nitro: {
    preset: process.env.NETLIFY ? 'netlify' : 'node-server',
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Force la fermeture propre du processus
    minify: process.env.NODE_ENV === 'production',
    experimental: {
      wasm: false
    }
  },

  // Force SSR mode, no static generation
  ssr: true,
  vite: {
    plugins: [tailwindcss()],
    build: {
      sourcemap: false
    }
  }
});
