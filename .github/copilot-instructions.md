# GitHub Copilot Instructions

## Projet Context
Ce projet utilise **Nuxt 3** avec **Tailwind CSS v4** et **daisyUI** pour le styling et les composants UI.

## Stack Technique
- **Framework**: Nuxt 3 (Vue 3)
- **Styling**: Tailwind CSS v4
- **Composants UI**: daisyUI
- **Configuration**: Plugin Vite (@tailwindcss/vite)
- **Fichier CSS principal**: `assets/app.css`

## Préférences de Code

### Styling et UI
- **Toujours privilégier les composants daisyUI** plutôt que du CSS custom
- Utiliser les classes sémantiques daisyUI : `btn`, `card`, `alert`, `badge`, `modal`, etc.
- Combiner avec les utilitaires Tailwind pour le layout : `flex`, `grid`, `p-4`, `m-2`, etc.
- Respecter la convention de nommage daisyUI pour les variants : `btn-primary`, `alert-success`, etc.

### Composants Vue
- Structurer les templates avec les composants daisyUI
- Utiliser les classes Tailwind pour le responsive design
- Préférer la composition API (`<script setup>`)
- Inclure les propriétés ARIA quand nécessaire

### Exemples de bonnes pratiques
```vue
<!-- ✅ Bon -->
<button class="btn btn-primary">Action</button>
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Titre</h2>
  </div>
</div>

<!-- ❌ Éviter -->
<button class="bg-blue-500 text-white px-4 py-2 rounded">Action</button>
```

### Thèmes et Dark Mode
- Utiliser les variables CSS daisyUI pour les couleurs
- Respecter les thèmes configurés
- Tester la compatibilité dark/light mode

## Structure du Projet
- Pages dans `/pages`
- Composants dans `/components`
- Layouts dans `/layouts`
- Assets CSS dans `/assets`
- Configuration Nuxt dans `nuxt.config.ts`

## Instructions Spécifiques
Quand je demande de créer ou modifier des composants UI :
1. Utilise prioritairement daisyUI
2. Complete avec Tailwind pour le layout
3. Assure-toi que c'est responsive
4. Inclus les bonnes pratiques d'accessibilité
5. Respecte la structure de fichiers Nuxt
