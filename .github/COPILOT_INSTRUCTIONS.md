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

```
# Copilot/AI: Admin Permission Rules

- Global middleware required for all admin entity pages.
- Redirect to login if not authenticated or insufficient permission.
- Use `useEntityPermission` composable for UI logic.
- Disable and grey out action buttons for read-only users; keep active for manager/admin.
- Export buttons always active.
- Use daisyUI + Tailwind for style and accessibility.
```
