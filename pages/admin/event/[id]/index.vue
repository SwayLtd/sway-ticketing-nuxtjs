<!-- pages/admin/event/[id].vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabaseClient, useSupabaseUser } from '#imports'

definePageMeta({
  layout: 'admin-event'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

const eventDetails = ref(null)
const loading = ref(true)
const notAuthorized = ref(false)

// Pour obtenir l'ID interne de l'utilisateur (integer) depuis la table "users"
const userIdInt = ref(null)

onMounted(async () => {
  const eventId = route.params.id
  if (!eventId) {
    loading.value = false
    return
  }

  // Récupération des détails de l'événement depuis la table "events"
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()
  if (eventError) {
    console.error("Erreur lors de la récupération de l'événement:", eventError)
    loading.value = false
    return
  }
  eventDetails.value = eventData

  // Récupérer l'enregistrement interne de l'utilisateur dans la table "users"
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_id', user.value.id)
    .single()
  if (userError || !userData) {
    console.error("Erreur lors de la récupération de l'utilisateur interne:", userError)
    notAuthorized.value = true
    loading.value = false
    return
  }
  userIdInt.value = userData.id

  // Vérifier dans la table "user_permissions" que l'utilisateur a une permission pour cet événement
  const { data: permData, error: permError } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userIdInt.value)
    .eq('entity_type', 'event')
    .eq('entity_id', eventId)
  if (permError) {
    console.error("Erreur lors de la récupération des permissions:", permError)
    notAuthorized.value = true
  } else if (!permData || permData.length === 0) {
    notAuthorized.value = true
  }
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
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-24">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"/>
        <p class="ml-4 text-lg text-gray-600">Chargement des détails...</p>
      </div>

      <!-- Not Authorized -->
      <div
v-else-if="notAuthorized"
        class="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg shadow-md">
        <div class="flex items-center">
          <svg class="h-8 w-8 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold text-red-800">Accès non autorisé</h3>
            <p class="text-red-700 mt-1">Vous n'avez pas les permissions nécessaires pour consulter
              cet
              événement.</p>
          </div>
        </div>
      </div>

      <!-- Event Details Layout -->
      <div v-else-if="eventDetails" class="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Event Info Card -->
          <div class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
            <div class="px-6 py-5 bg-gray-50">
              <h2 class="text-xl font-semibold text-gray-900">Informations générales</h2>
            </div>
            <div class="p-6 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Titre</label>
                  <p class="text-lg font-bold text-gray-900">{{ eventDetails.title }}</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">ID de
                    l'événement</label>
                  <p class="text-sm text-gray-700 font-mono bg-gray-100 px-3 py-1.5 rounded-md inline-block">
                    {{ eventDetails.id }}</p>
                </div>
              </div>

              <div v-if="eventDetails.type">
                <label class="block text-sm font-medium text-gray-500 mb-1">Type
                  d'événement</label>
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {{ eventDetails.type }}
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-1">Date & Heure de
                    début</label>
                  <p class="text-base text-gray-800 font-medium">{{ new
                    Date(eventDetails.date_time).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) }}
                  </p>
                </div>
                <div v-if="eventDetails.end_date_time">
                  <label class="block text-sm font-medium text-gray-500 mb-1">Date & Heure de
                    fin</label>
                  <p class="text-base text-gray-800 font-medium">{{ new
                    Date(eventDetails.end_date_time).toLocaleString('fr-FR', {
                      dateStyle: 'long', timeStyle: 'short'
                    }) }}</p>
                </div>
              </div>

              <div v-if="eventDetails.description">
                <label class="block text-sm font-medium text-gray-500 mb-1">Description</label>
                <p class="text-base text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {{ eventDetails.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-8">
          <!-- Event Image Card -->
          <div
v-if="eventDetails.image_url"
            class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
            <div class="px-6 py-5 bg-gray-50">
              <h2 class="text-xl font-semibold text-gray-900">Image de l'événement</h2>
            </div>
            <div class="p-6">
              <img
:src="eventDetails.image_url" alt="Image de l'événement"
                class="w-full h-auto rounded-lg shadow-md border border-gray-200">
            </div>
          </div>

          <!-- Metadata Card -->
          <div
v-if="eventDetails.metadata"
            class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
            <div class="px-6 py-5 bg-gray-50">
              <h2 class="text-xl font-semibold text-gray-900">Métadonnées</h2>
            </div>
            <div class="p-6">
              <pre
                class="text-sm text-gray-700 bg-gray-100 p-4 rounded-lg overflow-x-auto">{{ JSON.stringify(eventDetails.metadata, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
