# Solutions aux problèmes de build Nuxt

Ce dossier contient la documentation des solutions aux problèmes techniques rencontrés lors du développement.

## 📁 Organisation

- **[build-timeout-issue.md](./build-timeout-issue.md)** - Problème de build Nuxt qui ne se termine pas
- **[deployment-configuration.md](./deployment-configuration.md)** - Configuration optimale pour déploiement (Netlify, Vercel, etc.)

## 🔍 Comment utiliser cette documentation

1. **Identifier le problème** - Cherchez les symptômes dans les fichiers
2. **Appliquer la solution** - Suivez les étapes documentées
3. **Vérifier le résultat** - Testez que le problème est résolu
4. **Documenter les variations** - Ajoutez vos propres découvertes

## 📝 Format de documentation

Chaque solution suit ce format :

- **Problème** : Description claire du symptôme
- **Cause** : Explication technique de la cause
- **Solution** : Étapes détaillées de résolution
- **Prévention** : Comment éviter le problème à l'avenir

## 🆘 Problèmes courants

### Build qui ne se termine pas
→ Voir [build-timeout-issue.md](./build-timeout-issue.md)

**Symptômes :** Build bloqué après `[success] [nitro] Nuxt Nitro server built`  
**Solution :** Audit et suppression des modules avec processus persistants

### Erreurs de déploiement
→ Voir [deployment-configuration.md](./deployment-configuration.md)

**Symptômes :** Timeouts, 404 sur routes dynamiques, erreurs de build  
**Solution :** Configuration Netlify/Vercel optimisée

### Conflits de dépendances
**Symptômes :** `ERESOLVE unable to resolve dependency tree`  
**Solution :** Utiliser `--legacy-peer-deps` et mettre à jour les packages

## 📈 Historique des solutions

- **18/06/2025** - Résolution problème build timeout (modules persistants)
- **18/06/2025** - Configuration Netlify optimisée avec SSR
