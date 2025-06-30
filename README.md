[![Netlify Status](https://api.netlify.com/api/v1/badges/bf7079bf-cf5d-4cb9-8b09-d69e4724c794/deploy-status)](https://app.netlify.com/sites/swayapp/deploys)

# Sway Ticketing - Nuxt.js

Plateforme de billetterie événementielle construite avec Nuxt 3, Tailwind CSS v4 et daisyUI.

## 🛠️ Stack Technique

- **Framework**: Nuxt 3 (Vue 3)
- **Styling**: Tailwind CSS v4 + daisyUI
- **Base de données**: Supabase
- **Paiements**: Stripe
- **Déploiement**: Netlify

## 🎨 Design System

Ce projet utilise **daisyUI** comme système de composants principal :

- Classes sémantiques : `btn`, `card`, `alert`, `badge`, `modal`
- Thèmes configurables avec support dark/light mode
- Composants accessibles par défaut

### Conventions de styling

- Privilégier les composants daisyUI plutôt que du CSS custom
- Utiliser les utilitaires Tailwind pour le layout et l'espacement
- Respecter les conventions de nommage daisyUI pour les variants

## 📁 Structure du Projet

```text
├── components/          # Composants Vue réutilisables
├── layouts/            # Layouts Nuxt
├── pages/              # Pages et routes
├── assets/             # Assets statiques et CSS
├── server/             # API routes et middleware
└── supabase/           # Configuration et migrations Supabase
```

## 🚀 Développement

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase
- Compte Stripe

### Installation

```bash
# Cloner le repository
git clone <repository-url>
cd sway-ticketing-nuxtjs

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
```

### Configuration des variables d'environnement

```env
# Base
BASE_URL=http://localhost:3000

# Supabase
NUXT_PUBLIC_SUPABASE_URL=your_supabase_url
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### Démarrage du serveur de développement

```bash
# Développement standard
npm run dev

# Avec HTTPS (pour les tests mobile/caméra)
NUXT_DEV_HTTPS=true npm run dev
```

## 📚 Documentation

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

### Setting up Stripe

1. Create a Stripe account
2. Enable Stripe Connect
3. Set up webhook endpoints
4. Configure payment settings

### Setting up Stripe Webhooks for Local Development

1. Install the Stripe CLI:

   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows (using scoop)
   scoop install stripe

   # Linux
   curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
   echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
   sudo apt update
   sudo apt install stripe
   ```

2. Login to Stripe CLI:

   ```bash
   stripe login
   ```

3. Start webhook forwarding:

   ```bash
   stripe listen --forward-to https://localhost:3000/api/webhooks/stripe --skip-verify
   ```

4. Copy the webhook signing secret that is displayed after running the listen command and add it to your `.env.local`:

   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

5. Keep the webhook forwarding running while testing payments locally. The CLI will forward all webhook events to your local endpoint.

Note: Make sure your webhook endpoint (`/api/webhooks/stripe`) is properly configured to handle incoming webhook events.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
