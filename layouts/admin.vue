<template>
  <div class="admin-layout min-h-screen bg-gray-50">
    <AdminSidebar :menu-items="adminMenuItems" title="Administration" :current-path="$route.path" />

    <!-- Contenu principal -->
    <main class="w-full">
      <div class="p-6 min-h-screen pb-20 lg:pb-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup>
import { useAdminSidebar } from '~/composables/useAdminSidebar'

const { getAdminMenuItems } = useAdminSidebar()
const adminMenuItems = getAdminMenuItems()
</script>

<style scoped>
/* Styles personnalisés si nécessaire */
</style>