# Configuration optimale pour le déploiement

## 🚀 Netlify - Configuration recommandée

### netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = ".netlify/functions-internal"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--legacy-peer-deps"

# Redirects pour routes dynamiques SPA
[[redirects]]
  from = "/admin/*"
  to = "/admin/index.html"
  status = 200

[[redirects]]
  from = "/event/*"
  to = "/event/index.html"
  status = 200

# Fallback catch-all pour SSR
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Ce fallback statique est essentiel: le rendu SSR de Nuxt s'appuie sur
`index.html` pour démarrer correctement.

### Variables d'environnement Netlify

Variables à configurer dans l'interface Netlify :

```bash
# Base
NODE_ENV=production
NETLIFY=true

# Supabase
NUXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Application
BASE_URL=https://votre-app.netlify.app
```

## ⚙️ Configuration Nuxt optimisée

### nuxt.config.ts

```typescript
export default defineNuxtConfig({
  // Détection automatique environnement
  nitro: {
    preset: process.env.NETLIFY ? 'netlify' : 'node-server',
    logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    
    // Optimisations build
    legacyExternals: true,
    minify: process.env.NODE_ENV === 'production',
    
    // Éviter les processus persistants
    close: true,
    devProxy: false
  },

  // Mode SSR forcé
  ssr: true,

  // Optimisations Vite
  vite: {
    build: {
      sourcemap: false  // Réduire la taille
    }
  }
})
```

## 🔄 Autres plateformes

### Vercel

```json
// vercel.json
{
  "builds": [
    {
      "src": "nuxt.config.ts",
      "use": "@nuxtjs/vercel-builder"
    }
  ]
}
```

### Railway

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

## 📊 Optimisations performance

### Bundle analysis

```bash
# Analyser la taille du bundle
npm run build -- --analyze
```

### Variables conditionnelles

```typescript
// Modules selon environnement
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/ui',
    ...(process.env.NODE_ENV === 'development' ? [
      '@nuxt/devtools'
    ] : [])
  ]
})
```

## 🛡️ Sécurité déploiement

### Certificats SSL locaux

Assurer que les certificats de dev ne sont pas déployés :

```gitignore
# .gitignore
server.crt
server.key
*.pem
```

### Variables sensibles

```bash
# Ne jamais commiter dans le code
# Utiliser les variables d'environnement de la plateforme
STRIPE_SECRET_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 📝 Checklist déploiement

### Avant déploiement

- [ ] Build local réussi (`npm run build`)
- [ ] Variables d'environnement configurées
- [ ] Certificats SSL exclus (.gitignore)
- [ ] Tests fonctionnels passants
- [ ] Preview local testé (`npm run preview`)

### Après déploiement

- [ ] Routes dynamiques fonctionnelles
- [ ] APIs accessibles
- [ ] SSR fonctionnel (View Source)
- [ ] Performance acceptable (Lighthouse)
- [ ] Logs sans erreurs critiques
