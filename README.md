# Nuxt Minimal Starter

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
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
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
