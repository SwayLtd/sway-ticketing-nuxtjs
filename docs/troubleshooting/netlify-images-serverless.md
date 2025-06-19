# Images non accessibles dans les fonctions serverless Netlify

## 🚨 Problème

Les images stockées dans `/public/images/` ne sont pas accessibles dans les fonctions serverless Netlify, causant :

- Erreur `ENOENT: no such file or directory` lors de la lecture de fichiers images
- Emails envoyés sans logo/images
- PDFs générés sans images
- Échec d'envoi des emails de personnalisation

## 🔍 Cause

Les fonctions serverless Netlify s'exécutent dans un environnement isolé où :
- `process.cwd()` ne pointe pas vers le répertoire du projet
- Les chemins relatifs (`./public/images/`) ne fonctionnent pas
- Les fichiers statiques ne sont pas inclus automatiquement dans le bundle des fonctions

## ✅ Solution : Utiliser Netlify Image CDN

### 1. Configuration Nuxt

Assurer que `@nuxt/image` utilise le provider Netlify dans `nuxt.config.ts` :

```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxt/image'
  ],
  image: {
    provider: "netlify",
  },
})
```

### 2. Pour les emails HTML

Remplacer les attachments de fichiers par des URLs directes :

```typescript
// ❌ Ancien code (ne fonctionne pas sur Netlify)
const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.jpg');
attachments.push({ path: logoPath, cid: 'logo' });

// ✅ Nouveau code (fonctionne partout)
const logoUrl = `${process.env.BASE_URL}/images/logo.jpg`;
// Dans le HTML : <img src="${logoUrl}" alt="Logo" />
```

### 3. Pour les PDFs (PDFKit)

Télécharger l'image depuis l'URL Netlify :

```typescript
// ✅ Fetch depuis Netlify Image CDN
const logoUrl = `${process.env.BASE_URL}/images/logo.jpg`;
const response = await fetch(logoUrl);
const logoBuffer = Buffer.from(await response.arrayBuffer());

// Utiliser le buffer pour PDFKit
doc.image(logoBuffer, x, y, { width, height });
```

## 🔧 Code modifié

### Fichiers impactés :
- `server/utils/email.ts` - Templates HTML d'emails
- `server/api/ticket-personalization-email.ts` - Emails de personnalisation  
- `server/utils/ticket-pdf.ts` - Génération PDF des tickets

### Changements principaux :
1. **Suppression** des lectures de fichiers locales (`fs.readFileSync`, `fs.existsSync`)
2. **Remplacement** par URLs Netlify (`${process.env.BASE_URL}/images/...`)
3. **Suppression** des attachments `cid:logo` dans les emails
4. **Ajout** de `fetch()` pour télécharger les images pour les PDFs

## 🚀 Avantages de cette solution

- ✅ **Scalable** : Fonctionne pour toutes les images futures
- ✅ **Optimisé** : Utilise l'Image CDN Netlify avec optimisation automatique
- ✅ **Simple** : Pas de gestionnaire d'assets complexe
- ✅ **Robuste** : Fallback avec placeholder si l'image ne charge pas
- ✅ **Universal** : Fonctionne en dev, staging et production

## 📝 Pour ajouter de nouvelles images

1. Placer l'image dans `/public/images/nom-image.jpg`
2. Utiliser l'URL : `${process.env.BASE_URL}/images/nom-image.jpg`
3. Pour les PDFs : `fetch()` + `Buffer.from(await response.arrayBuffer())`

## 🐛 Résolution des erreurs liées

- `ENOENT: no such file or directory` → Utiliser URLs au lieu de chemins fichiers
- `Emails sans images` → Remplacer `cid:` par URLs directes
- `PDFs sans logo` → Fetch + Buffer au lieu de lecture fichier locale
- `Failed to send email` → Vérifier que `BASE_URL` est défini

---

**Résolu le :** 19/06/2025  
**Environnements testés :** Netlify Production, Local Dev  
**Impact :** Critique - Emails et PDFs fonctionnels
