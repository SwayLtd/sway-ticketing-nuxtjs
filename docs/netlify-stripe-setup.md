# Netlify & Stripe Webhook Setup

## 1. Stripe Webhook Events à sélectionner

Pour une application de billetterie, coche au minimum :

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`
- `transfer.created` (si tu utilises Stripe Connect)
- `account.updated` (si tu utilises Stripe Connect)
- `payout.paid` (si tu utilises Stripe Connect)

> **Astuce** : Tu peux aussi cocher "receive all events" pour la phase de test, puis restreindre plus tard.

## 2. Exemple de configuration Netlify

Dans le dashboard Netlify : **Site settings > Build & deploy > Environment > Environment variables**

Ajoute les variables suivantes (ne mets jamais les clés secrètes dans le code) :

- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...`
- `SUPABASE_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `JWT_SECRET=...`
- `SMTP_USER=...`
- `SMTP_PASS=...`
- etc.

Dans ton `.env` (commit dans le repo, safe pour les clés publiques) :

```env
BASE_URL=https://your-app.netlify.app
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_ANON_KEY=...
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 3. Script d'automatisation pour Stripe listen (local)

Crée un fichier `stripe-listen.sh` à la racine :

```bash
#!/bin/bash
# Utilise HTTPS si NUXT_DEV_HTTPS est "true", sinon HTTP
HTTPS=$(grep '^NUXT_DEV_HTTPS=' .env | cut -d '=' -f2 | tr -d '\r')
if [ "$HTTPS" = "true" ]; then
  URL="https://localhost:3000/api/webhooks/stripe"
else
  URL="http://localhost:3000/api/webhooks/stripe"
fi
stripe listen --forward-to "$URL" --skip-verify
```

Rends-le exécutable :

```bash
chmod +x stripe-listen.sh
```

Lance-le avec :

```bash
./stripe-listen.sh
```

---

**Besoin d’un script PowerShell ou d’autres exemples ? Demande !**
