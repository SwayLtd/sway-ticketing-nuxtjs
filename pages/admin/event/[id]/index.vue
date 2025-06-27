<!-- pages/admin/event/[id].vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEntityPermission } from '~/composables/useEntityPermission'
import { useSupabaseClient } from '#imports'

definePageMeta({
  layout: 'admin-event'
})

const supabase = useSupabaseClient()
const route = useRoute()

const eventDetails = ref(null)
const loading = ref(true)
const notAuthorized = ref(false)

const eventId = route.params.id

// Gestion permission centralisée
const { currentUserPermission, fetchPermission } = useEntityPermission(eventId, 'event')

onMounted(async () => {
  await fetchPermission()
  if (currentUserPermission.value === 0) {
    notAuthorized.value = true
    loading.value = false
    return
  }
  // Récupération des détails de l'événement
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()
  if (eventError) {
    loading.value = false
    return
  }
  eventDetails.value = eventData
  loading.value = false
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-1">Détails de l'événement</h1>
        </div>
        <!-- (Pas de bouton Éditer ici) -->
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-24">
        <span class="loading loading-spinner loading-lg text-primary" aria-label="Chargement" />
        <p class="ml-4 text-lg text-gray-600">Chargement des détails...</p>
      </div>

      <!-- Not Authorized -->
      <div
        v-else-if="notAuthorized"
        class="alert alert-error flex items-center gap-4">
        <svg class="h-8 w-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <div>
          <h3 class="text-lg font-semibold">Accès non autorisé</h3>
          <p class="mt-1">Vous n'avez pas les permissions nécessaires pour consulter cet événement.</p>
        </div>
      </div>

      <!-- Event Details Layout -->
      <div v-else-if="eventDetails" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Event Info Card -->
          <div class="card bg-base-100 shadow-xl border border-base-200">
            <div class="card-body">
              <h2 class="card-title">Informations générales</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label class="block text-sm font-medium text-base-content/70 mb-1">Titre</label>
                  <p class="text-lg font-bold">{{ eventDetails.title }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-base-content/70 mb-1">ID de l'événement</label>
                  <span class="badge badge-outline badge-lg font-mono">{{ eventDetails.id }}</span>
                </div>
              </div>
              <div v-if="eventDetails.type">
                <label class="block text-sm font-medium text-base-content/70 mb-1">Type d'événement</label>
                <span class="badge badge-info">{{ eventDetails.type }}</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label class="block text-sm font-medium text-base-content/70 mb-1">Date & Heure de début</label>
                  <p class="text-base font-medium">{{ new Date(eventDetails.date_time).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) }}</p>
                </div>
                <div v-if="eventDetails.end_date_time">
                  <label class="block text-sm font-medium text-base-content/70 mb-1">Date & Heure de fin</label>
                  <p class="text-base font-medium">{{ new Date(eventDetails.end_date_time).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) }}</p>
                </div>
              </div>
              <div v-if="eventDetails.description">
                <label class="block text-sm font-medium text-base-content/70 mb-1">Description</label>
                <p class="text-base bg-base-200 p-4 rounded-lg whitespace-pre-wrap">{{ eventDetails.description }}</p>
              </div>
            </div>
          </div>
        </div>
        <!-- Sidebar -->
        <div class="space-y-8">
          <!-- Event Image Card -->
          <div v-if="eventDetails.image_url" class="card bg-base-100 shadow-xl border border-base-200">
            <div class="card-body">
              <h2 class="card-title">Image de l'événement</h2>
              <img :src="eventDetails.image_url" alt="Image de l'événement" class="w-full h-auto rounded-lg shadow-md border border-base-200">
            </div>
          </div>
          <!-- Metadata Card -->
          <div v-if="eventDetails.metadata" class="card bg-base-100 shadow-xl border border-base-200">
            <div class="card-body">
              <h2 class="card-title">Métadonnées</h2>
              <pre class="text-sm bg-base-200 p-4 rounded-lg overflow-x-auto">{{ JSON.stringify(eventDetails.metadata, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
