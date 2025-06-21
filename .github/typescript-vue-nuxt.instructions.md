---
applyTo: "**/*.ts,**/*.tsx,**/*.vue"
---
# Project coding standards for TypeScript and Vue/Nuxt

Apply the [general coding guidelines](./general-coding.instructions.md) to all code.

## TypeScript Guidelines

### Type Definitions
- Use TypeScript for all new code
- Prefer `type` over `interface` for simple definitions
- Use `interface` for extensible object structures
- Always define return types for functions

```typescript
// ✅ Good - Using types
type UserStatus = 'active' | 'inactive' | 'pending'
type ApiResponse<T> = {
  data: T
  message: string
  success: boolean
}

// ✅ Good - Using interfaces for extensible structures
interface User {
  id: string
  name: string
  email: string
  status: UserStatus
}

interface AdminUser extends User {
  permissions: string[]
  lastLogin: Date
}
```

### Functional Programming Principles
- Prefer immutable data patterns
- Use `const` for variables that don't change
- Use `readonly` for arrays and objects
- Avoid mutations, create new objects instead

```typescript
// ✅ Good
const addUser = (users: readonly User[], newUser: User): readonly User[] => {
  return [...users, newUser]
}

// ❌ Avoid
const addUser = (users: User[], newUser: User): void => {
  users.push(newUser) // Mutation
}
```

### Modern TypeScript Features
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Leverage template literal types when appropriate
- Use utility types (`Partial`, `Pick`, `Omit`, etc.)

```typescript
// ✅ Good
const userName = user?.profile?.name ?? 'Anonymous'
const updateUser = (userId: string, updates: Partial<User>) => {
  // Update logic
}
```

## Nuxt Guidelines

### Component Structure
- Use Composition API with `<script setup>` syntax
- Follow the single-file component structure
- Keep template, script, and style sections organized

```vue
<template>
  <div class="user-card">
    <h2 class="card-title">{{ user.name }}</h2>
    <p v-if="user.email">{{ user.email }}</p>
    <button 
      class="btn btn-primary" 
      :disabled="isLoading"
      @click="handleAction"
    >
      {{ isLoading ? 'Loading...' : 'Action' }}
    </button>
  </div>
</template>

<script setup lang="ts">
// Props and emits
interface Props {
  user: User
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<{
  action: [userId: string]
}>()

// Composables
const { isLoading } = useAuth()

// Reactive state
const internalState = ref(false)

// Computed properties
const displayName = computed(() => 
  props.user.name || 'Anonymous User'
)

// Methods
const handleAction = () => {
  if (!props.disabled && !isLoading.value) {
    emit('action', props.user.id)
  }
}
</script>

<style scoped>
.user-card {
  @apply card bg-base-100 shadow-xl p-4;
}
</style>
```

### Composables Best Practices
- Use composables for reusable reactive logic
- Return plain objects with refs, not reactive objects
- Provide TypeScript types for composable return values
- Use `readonly` for values that shouldn't be modified externally

```typescript
// ✅ Good composable structure
export const useUserManagement = () => {
  const users = ref<User[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchUsers = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const { data } = await $fetch<User[]>('/api/users')
      users.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  const addUser = async (userData: Omit<User, 'id'>) => {
    // Implementation
  }

  // Return readonly refs where appropriate
  return {
    users: readonly(users),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchUsers,
    addUser
  }
}
```

### Data Fetching Patterns
- Use `useFetch` and `useAsyncData` for server-side data fetching
- Use `useLazyFetch` for client-side data that can be loaded later
- Implement proper error handling and loading states

```typescript
// ✅ Good - Server-side data fetching
const { data: events, error, pending } = await useFetch<Event[]>('/api/events', {
  key: 'events-list',
  default: () => [],
  transform: (data: any[]): Event[] => data.map(transformEventData)
})

// ✅ Good - Client-side lazy loading
const { data: userStats, pending: statsLoading } = await useLazyFetch<UserStats>(
  `/api/users/${userId}/stats`,
  {
    server: false
  }
)
```

### SEO and Meta Management
- Use `useHead` and `useSeoMeta` for proper SEO
- Define meta information at the page level
- Use dynamic meta based on data

```typescript
// ✅ Good SEO setup
useSeoMeta({
  title: computed(() => `${event.value?.name} - Sway Events`),
  description: computed(() => event.value?.description),
  ogTitle: computed(() => event.value?.name),
  ogDescription: computed(() => event.value?.description),
  ogImage: computed(() => event.value?.imageUrl),
  twitterCard: 'summary_large_image'
})
```

### State Management with Pinia
- Use Pinia for global state management
- Keep stores focused and modular
- Use TypeScript for store definitions

```typescript
// ✅ Good store structure
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  
  const login = async (credentials: LoginCredentials) => {
    // Login logic
  }
  
  const logout = () => {
    user.value = null
    navigateTo('/login')
  }
  
  return {
    user: readonly(user),
    isAuthenticated,
    login,
    logout
  }
})
```

### Performance Optimization
- Use `shallowRef` for large objects that don't need deep reactivity
- Implement `v-memo` for expensive list rendering
- Use `defineAsyncComponent` for code splitting
- Leverage Nuxt's auto-imports feature

```typescript
// ✅ Good performance practices
const heavyData = shallowRef<LargeDataStructure>({})

// Lazy load heavy components
const HeavyChart = defineAsyncComponent(() => 
  import('~/components/charts/HeavyChart.vue')
)
```
