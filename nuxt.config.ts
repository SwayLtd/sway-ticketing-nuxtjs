// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  runtimeConfig: {
    stripe: {
      key: process.env.STRIPE_SECRET_KEY,
      options: {},
    },
    public: {
      stripe: {
        key: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        options: {},
      },
      SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  },

  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/scripts',
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/test-utils',
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
  }
});
