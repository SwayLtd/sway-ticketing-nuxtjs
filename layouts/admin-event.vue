<!-- layouts/admin-event.vue -->
<template>
  <div class="admin-event-layout min-h-screen bg-gray-50">
    <AdminSidebar :menu-items="eventMenuItems" title="Event Management" :current-path="$route.path" />

    <!-- Contenu principal -->
    <main class="w-full">
      <div class="p-6 min-h-screen pb-20 lg:pb-6">
        <NuxtPage />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminSidebar } from '~/composables/useAdminSidebar'

const route = useRoute()
const eventId = route.params.id || ''

const { getEventMenuItems } = useAdminSidebar()
const eventMenuItems = computed(() => getEventMenuItems(eventId))
</script>
<style scoped>
/* Styles personnalisés si nécessaire */
</style>