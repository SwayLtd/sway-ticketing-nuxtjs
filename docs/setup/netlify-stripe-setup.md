# Netlify & Stripe Webhook Setup

## 🚨 IMPORTANT - Stripe Connect & Webhooks

**DÉCOUVERTE CRUCIALE** : Avec Stripe Connect, les webhooks pour `checkout.session.completed` passent par le compte PRINCIPAL ("Your Account") et NON par les comptes connectés, même si le paiement utilise un compte connecté !

### Configuration correcte

1. **Créer le webhook sur "Your Account"** (compte principal)
2. **URL** : `https://test.sway.events/api/webhooks/stripe`
3. **Utiliser le `STRIPE_WEBHOOK_SECRET` du webhook "Your Account"**
4. **PAS celui du webhook "Connected accounts"**

### Mode Test vs Production

- **Mode Test** : Webhook configuré sur <https://dashboard.stripe.com/test/webhooks>
- **Mode Production** : Webhook configuré sur <https://dashboard.stripe.com/webhooks>
- ⚠️ **Les deux sont séparés** : il faut configurer les webhooks dans chaque mode !

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

## 4. Troubleshooting - Problèmes courants

### ❌ Le webhook ne se déclenche pas après paiement

**Symptômes** :
- Le paiement Stripe réussit
- Pas d'événements dans les logs Netlify
- Pas de commande créée dans Supabase
- Page de succès sans données de commande

**Causes principales** :

1. **Mauvaise configuration mode Test/Production** :
   - Vérifiez que vous êtes en mode TEST sur Stripe si vous utilisez des clés de test
   - Les webhooks Test et Production sont complètement séparés !

2. **Mauvais webhook secret avec Stripe Connect** :
   - ✅ **CORRECT** : Utiliser le secret du webhook "Your Account"
   - ❌ **INCORRECT** : Utiliser le secret du webhook "Connected accounts"
   - Même avec Stripe Connect, `checkout.session.completed` passe par le compte principal

3. **URL du webhook incorrecte** :
   - ✅ **CORRECT** : `https://test.sway.events/api/webhooks/stripe`
   - ❌ **INCORRECT** : `http://localhost:3000/...` (en production)

### 🔍 Diagnostic étape par étape

1. **Vérifiez le mode Stripe** :
   - Interface Stripe : URL doit contenir `/test/` pour le mode test
   - Variables env : `STRIPE_SECRET_KEY` doit commencer par `sk_test_`

2. **Testez le webhook manuellement** :
   ```bash
   node test-with-netlify-logs.js
   ```

3. **Vérifiez les logs Netlify** :
   - Netlify Dashboard → Functions → Logs
   - Cherchez les logs "=== WEBHOOK STRIPE DEBUG ==="

4. **Vérifiez Stripe Dashboard** :
   - Webhooks → Recent attempts
   - Events → Recherchez `checkout.session.completed`

### ✅ Flux de paiement réussi

Quand tout fonctionne, le flux est :
1. `https://your-app.netlify.app/event/51/tickets`
2. Stripe Checkout (avec compte connecté)
3. Webhook déclenché sur compte principal
4. Commande créée dans Supabase
5. Email envoyé
6. Redirection vers `https://test.sway.events/success?provider_order_id=cs_test_...`
7. Page de succès avec récapitulatif de commande
8. Possibilité de customiser les tickets

---

**Besoin d’un script PowerShell ou d’autres exemples ? Demande !**
