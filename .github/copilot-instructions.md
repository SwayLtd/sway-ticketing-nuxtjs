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
- **Imposer le thème daisyUI `light` par défaut** (via `data-theme="light"` sur `<html>` ou `useHead` dans `app.vue`)
- Toujours vérifier le contraste texte/fond pour garantir l’accessibilité en mode clair (fond blanc)
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

---

# Copilot & AI Coding Guidelines for Admin Permissions

## Authentication & Permissions

- All admin entity pages (event, promoter, etc.) **must** be protected by the global middleware `auth-entity-permission.global.ts`.
- If the user is not authenticated or lacks the required role, redirect to `/login?redirect=...` (see `utils/redirect.ts`).

## UI Permission Management

- Always use the composable `useEntityPermission.ts` to get the current user's permission level for the entity.
- If the user is **read-only** (`permission_level === 1`):
  - All action buttons (add, edit, delete, deactivate, duplicate) **must be disabled and visually greyed out** (use daisyUI + Tailwind classes: `btn`, `btn-disabled`, `opacity-50`, `cursor-not-allowed`).
  - **Export buttons** (CSV, PDF, etc.) must remain active for all roles.
- If the user is **manager or admin** (`permission_level >= 2`):
  - All action buttons must remain active.

## Best Practices

- Always use daisyUI components for buttons and disabled states (`btn`, `btn-disabled`, etc.).
- Never trigger JS actions if the button is disabled.
- Enforce permission logic both in the UI **and** in backend/API endpoints.
- Use accessible attributes (e.g., `aria-disabled`) for all disabled buttons.

## References

- Middleware: `middleware/auth-entity-permission.global.ts`
- Secure redirect: `utils/redirect.ts`
- Permission composable: `composables/useEntityPermission.ts`

---

## Bonus: Quick Summary for Copilot/AI

```md
# Copilot/AI: Admin Permission Rules

- Global middleware required for all admin entity pages.
- Redirect to login if not authenticated or insufficient permission.
- Use `useEntityPermission` composable for UI logic.
- Disable and grey out action buttons for read-only users; keep active for manager/admin.
- Export buttons always active.
- Use daisyUI + Tailwind for style and accessibility.
```
