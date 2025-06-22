---
applyTo: "**"
---
# Project general coding standards

## Development Environment

### Package Manager and Runtime
- **Use Bun for development**: Always use `npm run dev:bun` instead of `npm run dev`
- **Bun advantages**: Faster startup times, better performance, native TypeScript support
- **Production builds**: Use `bun run build:bun` for production builds
- **Installation**: Use `bun install` for package installation when possible

### Development Commands
```bash
# ✅ Preferred for development
npm run dev:bun        # Start development server with Bun
bun run build:bun      # Build for production with Bun
bun install            # Install dependencies

# ❌ Avoid for development (slower)
npm run dev            # Standard Node.js development server
```

## Naming Conventions

### Files and Directories
- **Directories**: Use lowercase with dashes (kebab-case)
  - Examples: `components/user-profile`, `pages/event-management`
- **Vue Components**: Use PascalCase for filenames
  - Examples: `UserProfile.vue`, `EventCard.vue`, `AdminSidebar.vue`
- **TypeScript/JavaScript files**: Use camelCase
  - Examples: `userService.ts`, `eventUtils.ts`, `apiClient.ts`
- **Composables**: Prefix with `use` and use camelCase
  - Examples: `useAuth.ts`, `useScanner.ts`, `useEventManagement.ts`
- **Types/Interfaces**: Use PascalCase
  - Examples: `User.ts`, `Event.ts`, `ApiResponse.ts`

### Code Naming
- **Variables**: Use camelCase with descriptive names
  - Examples: `isLoading`, `hasError`, `userProfile`, `eventsList`
- **Functions**: Use camelCase with action verbs
  - Examples: `createUser()`, `validateInput()`, `fetchEvents()`
- **Constants**: Use SCREAMING_SNAKE_CASE
  - Examples: `API_BASE_URL`, `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT`
- **CSS Classes**: Use kebab-case (following daisyUI and Tailwind conventions)
  - Examples: `btn-primary`, `card-title`, `user-avatar`

### Nuxt.js Specific Conventions
- **Pages**: Use kebab-case, follow file-based routing
  - Examples: `index.vue`, `about.vue`, `user-profile.vue`, `[id].vue`
- **Layouts**: Use kebab-case
  - Examples: `default.vue`, `admin.vue`, `user-dashboard.vue`
- **Middleware**: Use kebab-case
  - Examples: `auth.ts`, `admin-only.ts`, `guest-only.ts`
- **Plugins**: Use kebab-case with descriptive names
  - Examples: `supabase.client.ts`, `stripe.client.ts`

## Error Handling

### Async Operations
- Always use try/catch blocks for async operations
- Implement proper error boundaries in Vue components
- Use composables for consistent error handling patterns

```typescript
// ✅ Good
const { data, error } = await useFetch('/api/users', {
  onResponseError: ({ response }) => {
    console.error('API Error:', response.status, response.statusText)
  }
})

// ✅ Good
try {
  const result = await someAsyncOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw createError({
    statusCode: 500,
    statusMessage: 'Operation failed'
  })
}
```

### Error Logging
- Always log errors with contextual information
- Include user ID, timestamp, and relevant data
- Use structured logging for better debugging

```typescript
// ✅ Good
console.error('Failed to create user', {
  userId: user.id,
  timestamp: new Date().toISOString(),
  error: error.message,
  stack: error.stack
})
```

### User-Friendly Error Messages
- Display meaningful error messages to users
- Use toast notifications or alert components
- Provide actionable feedback when possible

## Code Organization

### File Structure
- Keep components small and focused (< 200 lines)
- Separate business logic into composables
- Use utility functions for reusable code
- Organize related files in feature-based directories

### Import Organization
```typescript
// 1. Vue/Nuxt imports
import { ref, computed } from 'vue'
import { useFetch } from '#app'

// 2. Third-party libraries
import { z } from 'zod'

// 3. Local imports
import { useAuth } from '~/composables/useAuth'
import type { User } from '~/types/User'
```

## Performance Best Practices

- Use `useLazyFetch` for non-critical data
- Implement proper caching strategies
- Lazy load components when appropriate
- Optimize images and assets
- Use `readonly` for immutable data
- Prefer `shallowRef` for large objects when deep reactivity isn't needed
