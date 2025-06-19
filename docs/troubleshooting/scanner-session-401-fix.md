# Résolution du problème de session scanner invalide

## 📋 Problème

**Symptômes :**
- Scanner QR fonctionnel en développement mais échec en production
- Erreur 401 "Unauthorized" lors de la validation de session
- Token apparemment valide mais rejeté par l'API
- Message client : "Session validation failed during scan - session expired"

**Logs d'erreur :**
```
RangeError: Invalid time value
    at Date.toISOString (<anonymous>)
    at Object.handler (file:///var/task/chunks/routes/api/scanner/session.mjs:1:2694)
```

## 🔍 Cause racine

Le problème était un **bug dans le calcul de l'expiration du token de session** dans l'API `/api/scanner/session`.

### Diagnostic détaillé effectué :

1. ✅ **Génération du token** : Fonctionnelle avec bon JWT_SECRET
2. ✅ **Vérification de signature** : Signatures correspondantes
3. ✅ **Session en mémoire** : Session trouvée et active
4. ❌ **Calcul d'expiration** : `RangeError: Invalid time value`

### Code problématique :
```typescript
// ❌ AVANT - Utilisait le timestamp de création au lieu de l'expiration
expires_at: new Date(sessionData.timestamp + (8 * 60 * 60 * 1000)).toISOString()
```

### Problème technique :
- `sessionData.timestamp` = timestamp de création du token
- `decoded.expires` = timestamp d'expiration réel du token
- Utiliser `sessionData.timestamp + 8h` créait une valeur invalide causant `RangeError`

## ✅ Solution

### 1. Correction du calcul d'expiration

**Fichier :** `server/api/scanner/session.ts`

```typescript
// ✅ APRÈS - Utilise l'expiration réelle du token
// Décoder le token pour récupérer l'expiration réelle
const decoded = JSON.parse(Buffer.from(session_token, 'base64').toString())

return {
    valid: true,
    scanner_id: sessionData.scanner_id,
    event_id: sessionData.event_id,
    expires_at: new Date(decoded.expires).toISOString() // ← Correction ici
}
```

### 2. Suppression du fallback JWT_SECRET

**Problème :** Utilisation de `'fallback-secret'` masquait les problèmes de configuration

**Solution :** Validation stricte avec logs d'erreur explicites

```typescript
// ✅ Validation stricte du JWT_SECRET
if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is not defined!')
    throw new Error('JWT_SECRET environment variable is required')
}

const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET) // Plus de fallback
    .update(data + timestamp)
    .digest('hex')
```

**Fichiers modifiés :**
- `server/api/scanner/authenticate.post.ts`
- `server/api/scanner/session.ts`  
- `server/api/scanner/validate-qr.post.ts`

### 3. Amélioration de la gestion des sessions en production

**Problème :** Sessions perdues après redémarrage serverless Netlify

**Solution :** Recréation automatique des sessions si scanner toujours actif

```typescript
// En production, vérifier que le scanner existe toujours en base
if (!activeSession && process.env.NODE_ENV === 'production') {
    const { data: scanner, error } = await supabase
        .from('scanners')
        .select('id, status')
        .eq('id', sessionData.scanner_id)
        .eq('event_id', sessionData.event_id)
        .eq('status', 'active')
        .single()

    if (scanner) {
        // Recréer la session si scanner toujours actif
        const newSession = {
            scanner_id: sessionData.scanner_id,
            event_id: sessionData.event_id,
            created_at: Date.now(),
            last_activity: Date.now()
        }
        activeSessions.set(sessionKey, newSession)
    }
}
```

## 🧪 Validation

**Test effectué :**
1. ✅ Connexion scanner avec token valide
2. ✅ Validation de session sans erreur 401
3. ✅ Scan QR réussi avec enregistrement en base
4. ✅ Logs confirment le bon fonctionnement

**Résultat des logs :**
```
✅ Token verified successfully
🔍 SESSION CHECK: { hasActiveSession: true }
✅ Active session found, updating last activity
DEBUG: scanResult: { "success": true, "ticket": { "status": "scanned" } }
```

## 🛡️ Prévention

### Variables d'environnement obligatoires

**Netlify Environment Variables :**
- `JWT_SECRET` : Clé de 128+ caractères, marquée "Contains secret values"
- Aucun fallback autorisé pour forcer la configuration correcte

### Monitoring

**Logs à surveiller :**
- `❌ CRITICAL: JWT_SECRET environment variable is not defined!`
- `RangeError: Invalid time value` 
- `Signature mismatch` dans la vérification de token

### Tests réguliers

1. **Test de session** : Connexion → Scan → Vérification logs
2. **Test de redémarrage** : Simuler redémarrage serverless
3. **Test de token expiré** : Vérifier gestion expiration

## 📊 Impact de la solution

- ✅ **Développement** : Inchangé, fonctionne toujours
- ✅ **Production** : Scanner désormais fonctionnel  
- ✅ **Sécurité** : Validation stricte JWT_SECRET obligatoire
- ✅ **Monitoring** : Logs explicites en cas de problème
- ✅ **Serverless** : Gestion robuste des redémarrages

## 🔗 Liens connexes

- [Gestion des images serverless](./netlify-images-serverless.md)
- [Configuration déploiement](./deployment-configuration.md)

---

**Date de résolution :** 19 juin 2025  
**Équipe :** Développement Scanner QR  
**Statut :** ✅ Résolu et documenté
