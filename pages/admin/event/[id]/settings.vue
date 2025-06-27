<template>
  <div class="container">
    <h1>Paramètres de l'événement</h1>
    <div v-if="loadingEvent">
      <p>Chargement de l'événement…</p>
    </div>
    <div v-else>
      <div class="eventInfo">
        <h2>{{ event.title }}</h2>
        <p>
          {{ formatDate(event.date_time) }}
          <span v-if="event.end_date_time">
            - {{ formatDate(event.end_date_time) }}
          </span>
        </p>
        <p v-if="event.promoter_stripe_account_id">
          <strong>Promoter Stripe Account ID:</strong>
          {{ event.promoter_stripe_account_id }}
        </p>
      </div>

      <h2>Lier un promoteur à l'événement</h2>
      <div v-if="loadingPromoters">
        <p>Chargement des promoteurs…</p>
      </div>
      <div v-else-if="promoters.length">
        <table>
          <thead>
            <tr>
              <th>Nom du promoteur</th>
              <th>Stripe Account ID</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="prom in promoters" :key="prom.id">
              <td>{{ prom.name }}</td>
              <td>{{ prom.stripe_account_id }}</td>
              <td>
                <button
                  :disabled="updating || currentUserPermission < 2"
                  :class="[updating || currentUserPermission < 2 ? 'opacity-50 cursor-not-allowed' : '', 'transition-all']"
                  @click="currentUserPermission >= 2 && linkPromoterToEvent(prom.id, prom.stripe_account_id)"
                >
                  {{ updating ? 'Mise à jour…' : 'Lier ce promoteur' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else>
        <p>Aucun promoteur avec un compte Stripe disponible.</p>
      </div>
      <p v-if="message" :style="{ color: messageColor }">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { format } from 'date-fns'
import { useEntityPermission } from '~/composables/useEntityPermission'

// Utilisation du layout admin (défini dans layouts/admin.vue ou admin-event.vue)
definePageMeta({
  layout: 'admin-event'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

const eventId = Number(route.params.id)

// Réactives pour l'événement
const event = ref<any>(null)
const loadingEvent = ref(true)

// Réactives pour la liste des promoteurs
const promoters = ref<any[]>([])
const loadingPromoters = ref(true)

// Réactives pour l'édition
const updating = ref(false)
const message = ref('')
const messageColor = ref('green')

// Permission logic
const { currentUserPermission, fetchPermission } = useEntityPermission(eventId, 'event')
const notAuthorized = ref(false)

// Formatage de la date
const formatDate = (dateStr: string) => format(new Date(dateStr), 'EEEE dd MMM yyyy, HH:mm')

// Fonction pour récupérer l'événement
async function fetchEvent() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()
  if (error) {
    console.error("Erreur lors de la récupération de l'événement:", error)
  } else {
    event.value = data
  }
  loadingEvent.value = false
}

// Pour récupérer l'ID interne de l'utilisateur (de type integer) depuis la table "users"
const userIdInt = ref<number | null>(null)
async function fetchUserInternalId() {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_id', user.value.id)
    .single()
  if (error) {
    console.error("Erreur lors de la récupération de l'utilisateur interne:", error)
  } else {
    userIdInt.value = data.id
  }
}

// Fonction pour récupérer les promoteurs pour lesquels l'utilisateur a des permissions
async function fetchPromoters() {
  if (!userIdInt.value) return;
  // Récupérer les permissions de type "promoter" pour l'utilisateur
  const { data: perms, error: permError } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userIdInt.value)
    .eq('entity_type', 'promoter');
  if (permError) {
    console.error("Erreur lors de la récupération des permissions:", permError);
    loadingPromoters.value = false;
    return;
  }
  const proms: any[] = [];
  for (const perm of perms || []) {
    // Utilisez l'opérateur neq pour filtrer ceux qui ont stripe_account_id non nul
    const { data: promData, error: promError } = await supabase
      .from('promoters')
      .select('*')
      .eq('id', perm.entity_id)
      .neq('stripe_account_id', null) // Filtrer ceux ayant un stripe_account_id renseigné
      .single();
    if (!promError && promData && promData.stripe_account_id) {
      proms.push(promData);
    }
  }
  promoters.value = proms;
  loadingPromoters.value = false;
}

// Récupérer le niveau de permission pour l'événement courant
async function fetchUserPermission() {
  if (!user.value) {
    notAuthorized.value = true
    return
  }
  // Récupérer l'ID interne utilisateur
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_id', user.value.id)
    .single()
  if (userError || !userData) {
    notAuthorized.value = true
    return
  }
  userIdInt.value = userData.id
  // Vérifier la permission pour cet event
  const { data: permData, error: permError } = await supabase
    .from('user_permissions')
    .select('permission_level')
    .eq('user_id', userIdInt.value)
    .eq('entity_type', 'event')
    .eq('entity_id', eventId)
    .single()
  if (permError || !permData) {
    notAuthorized.value = true
    return
  }
  currentUserPermission.value = permData.permission_level
}

// Fonction pour lier un promoteur à l'événement
async function linkPromoterToEvent(promoterId: number, promoterStripeAccountId: string) {
  updating.value = true
  message.value = ''
  // On met à jour l'événement en ajoutant le stripe_account_id du promoteur
  const { error } = await supabase
    .from('events')
    .update({ promoter_stripe_account_id: promoterStripeAccountId })
    .eq('id', eventId)
  if (error) {
    console.error("Erreur lors de la mise à jour de l'événement:", error)
    message.value = error.message
    messageColor.value = 'red'
  } else {
    message.value = "Le compte Stripe du promoteur a été lié à l'événement."
    messageColor.value = 'green'
    // Optionnel : Mettre à jour l'objet event localement
    event.value.promoter_stripe_account_id = promoterStripeAccountId
  }
  updating.value = false
}

onMounted(async () => {
  await fetchPermission()
  await fetchEvent()
  await fetchUserInternalId()
  await fetchUserPermission()
  await fetchPromoters()
})
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
  font-family: sans-serif;
  color: #fff;
  background-color: #1e1e1e;
  border-radius: 8px;
}

.eventInfo h2 {
  margin: 0;
  font-size: 1.75rem;
}

.eventInfo p {
  font-size: 1.2rem;
  color: #ccc;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th,
td {
  border: 1px solid #444;
  padding: 8px;
  text-align: left;
}

button {
  padding: 0.5rem 1rem;
  background-color: #6772e5;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 8px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>