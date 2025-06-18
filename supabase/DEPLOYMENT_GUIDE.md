# Guide de Déploiement - Scanner Sécurisé

## Vue d'ensemble

Ce guide détaille le déploiement du nouveau système de scan sécurisé en production.

## Pré-requis

### 1. Base de données Supabase

Assurez-vous que les migrations suivantes ont été appliquées :

```sql
-- Migration sécurité scanner
-- Ajout des champs de sécurité à la table scanners
ALTER TABLE scanners ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE scanners ADD COLUMN IF NOT EXISTS last_activity timestamptz;
ALTER TABLE scanners ADD COLUMN IF NOT EXISTS session_count integer DEFAULT 0;
ALTER TABLE scanners ADD COLUMN IF NOT EXISTS last_ip inet;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_scanners_event_id ON scanners(event_id);
CREATE INDEX IF NOT EXISTS idx_scanners_last_activity ON scanners(last_activity);

-- Migration RLS tickets
-- Activer RLS sur la table tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policies pour l'accès aux tickets
CREATE POLICY "Users can access their own tickets" ON tickets
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can personalize their tickets" ON tickets
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can access all tickets" ON tickets
FOR ALL USING (auth.role() = 'service_role');

-- Policy pour l'accès par token de personnalisation
CREATE POLICY "Access via personalization token" ON tickets
FOR ALL USING (
    current_setting('app.personalization_token', true) = personalization_token
);
```

### 2. Fonction RPC Sécurisée

La fonction `validate_qr_code` doit être mise à jour avec la logique HMAC :

```sql
-- Voir le fichier supabase/rpc/validate_qr_code.sql
```

### 3. Variables d'environnement

```bash
# Clés de sécurité
SCANNER_HMAC_SECRET=your_super_secret_hmac_key_here
SCANNER_SESSION_SECRET=your_session_secret_key_here

# Configuration rate limiting
RATE_LIMIT_AUTH_PER_MINUTE=5
RATE_LIMIT_SCAN_PER_MINUTE=100
RATE_LIMIT_SESSION_PER_MINUTE=10

# Configuration sessions
SESSION_DURATION_HOURS=8
SESSION_CLEANUP_INTERVAL_HOURS=1
```

## Étapes de Déploiement

### 1. Backup Base de Données

```bash
# Créer un backup avant déploiement
supabase db dump --data-only > backup_pre_security_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Déploiement des Migrations

```bash
# Appliquer les migrations de sécurité
supabase db push

# Vérifier les migrations
supabase migration list
```

### 3. Déploiement du Code

```bash
# Build production
npm run build

# Déploiement (selon votre plateforme)
# Vercel:
vercel --prod

# Netlify:
netlify deploy --prod

# Docker:
docker build -t sway-scanner .
docker run -p 3000:3000 sway-scanner
```

### 4. Configuration DNS/SSL

Assurez-vous que :
- HTTPS est activé
- Certificats SSL sont valides
- Headers de sécurité sont configurés

### 5. Tests Post-Déploiement

```bash
# Test automatisé
node test-scanner-security.js

# Test manuel
# 1. Ouvrir https://yourdomain.com/scanner
# 2. Tester l'authentification
# 3. Vérifier le scan QR
# 4. Contrôler les logs
```

## Vérifications de Sécurité

### 1. Headers HTTP

```nginx
# Configuration Nginx recommandée
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
```

### 2. Monitoring

```bash
# Vérifier les logs de sécurité
tail -f /var/log/sway/scanner-security.log

# Surveiller les métriques
# - Taux d'authentification
# - Échecs de validation
# - Utilisation des sessions
```

### 3. Alertes

Configurer des alertes pour :
- Échecs d'authentification répétés
- Tentatives de scan invalides
- Erreurs de validation HMAC
- Sessions expirées anormalement

## Rollback d'Urgence

### Plan de Rollback

1. **Code** : Déployer la version précédente
2. **Base de données** : Restaurer le backup
3. **Configuration** : Réactiver l'ancien système

```bash
# Rollback rapide
git checkout previous-version
npm run build
vercel --prod

# Restaurer la base si nécessaire
supabase db reset --linked
```

### Procédure d'Urgence

```bash
# 1. Désactiver les nouvelles authentifications
# Mettre SCANNER_SECURITY_ENABLED=false

# 2. Basculer vers le mode legacy
# Activer LEGACY_SCANNER_MODE=true

# 3. Notifier les équipes
echo "Scanner sécurisé désactivé - mode legacy actif" | mail -s "ALERT: Scanner Rollback" ops@sway.events
```

## Tests de Charge

### 1. Test d'Authentification

```bash
# Test avec Artillery
artillery quick --count 10 --num 5 https://yourdomain.com/api/scanner/authenticate
```

### 2. Test de Scan

```bash
# Simuler 100 scans simultanés
ab -n 100 -c 10 -T application/json -p test-qr-data.json https://yourdomain.com/api/scanner/validate-qr
```

### 3. Test de Session

```bash
# Test de sessions concurrentes
for i in {1..50}; do
  curl -s "https://yourdomain.com/api/scanner/session?session_token=test_$i" &
done
wait
```

## Maintenance

### 1. Nettoyage des Sessions

```sql
-- Supprimer les sessions expirées (automatique via cron)
DELETE FROM scanner_sessions 
WHERE expires_at < now() - interval '1 hour';
```

### 2. Rotation des Clés

```bash
# Générer nouvelles clés HMAC (rotation mensuelle)
openssl rand -hex 32 > new_hmac_secret.txt
openssl rand -hex 32 > new_session_secret.txt

# Mettre à jour les variables d'environnement
# Redéployer l'application
```

### 3. Monitoring Continu

```bash
# Script de monitoring (à exécuter via cron)
#!/bin/bash
# Vérifier la santé du système
curl -f https://yourdomain.com/api/health/scanner || echo "Scanner system down" | mail ops@sway.events

# Vérifier les métriques de sécurité
node scripts/check-security-metrics.js
```

## Dépannage

### Problèmes Courants

1. **Erreur d'authentification**
   - Vérifier les tokens scanner
   - Contrôler les variables d'environnement
   - Vérifier les logs de sécurité

2. **Sessions expirées**
   - Vérifier l'horloge système
   - Contrôler la configuration de durée
   - Vérifier le nettoyage automatique

3. **Échecs de validation HMAC**
   - Vérifier la clé secrète
   - Contrôler le format des données
   - Vérifier la synchronisation temporelle

### Logs Importants

```bash
# Logs d'authentification
grep "SCANNER_AUTH" /var/log/sway/security.log

# Logs de validation
grep "QR_VALIDATION" /var/log/sway/security.log

# Logs d'erreur
grep "ERROR" /var/log/sway/scanner.log
```

## Support

- **Documentation** : `/docs/scanner-security`
- **Logs** : `/api/scanner/logs`
- **Métriques** : `/api/scanner/metrics`
- **Support** : security@sway.events
