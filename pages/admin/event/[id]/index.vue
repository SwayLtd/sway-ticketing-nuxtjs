<!-- pages/admin/event/[id].vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSupabaseClient, useSupabaseUser } from '#imports'

definePageMeta({
  layout: 'admin-event'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()
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

function goBack() {
  router.back()
}
</script>

<template>
  <div class="container">
    <h1>Détails de l'événement</h1>
    <div v-if="loading">
      <p>Chargement…</p>
    </div>
    <div v-else>
      <div v-if="notAuthorized">
        <p>Pas autorisé.</p>
      </div>
      <div v-else-if="eventDetails">
        <p><strong>ID:</strong> {{ eventDetails.id }}</p>
        <p><strong>Titre:</strong> {{ eventDetails.title }}</p>
        <p v-if="eventDetails.type"><strong>Type:</strong> {{ eventDetails.type }}</p>
        <p><strong>Date & Heure:</strong> {{ eventDetails.date_time }}</p>
        <p v-if="eventDetails.end_date_time"><strong>Fin:</strong> {{ eventDetails.end_date_time }}</p>
        <p v-if="eventDetails.description"><strong>Description:</strong> {{ eventDetails.description }}</p>
        <div v-if="eventDetails.image_url">
          <img :src="eventDetails.image_url" alt="Image de l'événement">
        </div>
        <div v-if="eventDetails.metadata">
          <p><strong>Metadata:</strong> {{ eventDetails.metadata }}</p>
        </div>
      </div>
      <button @click="goBack">Retour</button>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
  font-family: sans-serif;
}
img {
  max-width: 100%;
  height: auto;
  margin-bottom: 1rem;
}
button {
  padding: 0.75rem 1.5rem;
  background-color: #6772e5;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}
</style>
