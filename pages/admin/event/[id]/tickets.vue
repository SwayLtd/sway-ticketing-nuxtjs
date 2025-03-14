<!-- pages/admin/event/[id]/tickets.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabaseClient } from '#imports'

definePageMeta({
  layout: 'admin-event'
})

const supabase = useSupabaseClient()
const route = useRoute()

// Récupérer l'ID de l'événement depuis l'URL
const eventId = route.params.id

// Variables pour le formulaire d'ajout
const ticketName = ref('')
const ticketDescription = ref('')
const ticketPrice = ref(0)
const maxPerOrder = ref(null)
const currency = ref('EUR') // valeur par défaut

// Variables pour la liste des tickets existants
const tickets = ref([])
const loadingTickets = ref(false)
const addingTicket = ref(false)
const message = ref('')
const messageColor = ref('green')

// Fonction pour récupérer les types de tickets pour cet événement
async function fetchTickets() {
  loadingTickets.value = true
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('entity_type', 'event')
      .eq('entity_id', eventId)
    if (error) {
      console.error('Erreur lors de la récupération des tickets:', error)
    } else {
      tickets.value = data
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des tickets:', err)
  } finally {
    loadingTickets.value = false
  }
}

// Fonction pour ajouter un nouveau type de ticket
async function addTicketType() {
  // Vérifier que le champ nom n'est pas vide
  if (!ticketName.value.trim()) {
    message.value = "Le nom du ticket est requis."
    messageColor.value = 'red'
    return
  }
  addingTicket.value = true
  message.value = ''
  try {
    const { error } = await supabase
      .from('products')
      .insert([{
        name: ticketName.value,
        description: ticketDescription.value,
        price: ticketPrice.value,
        currency: currency.value,
        entity_type: 'event',
        entity_id: eventId,
        max_per_order: maxPerOrder.value
      }])
    if (error) {
      console.error('Erreur lors de l\'ajout du ticket:', error)
      message.value = error.message
      messageColor.value = 'red'
    } else {
      message.value = 'Type de ticket ajouté avec succès.'
      messageColor.value = 'green'
      // Réinitialiser le formulaire
      ticketName.value = ''
      ticketDescription.value = ''
      ticketPrice.value = 0
      maxPerOrder.value = null
      // Rafraîchir la liste
      await fetchTickets()
    }
  } catch (err) {
    console.error('Erreur lors de l\'ajout du ticket:', err)
    message.value = 'Erreur inattendue'
    messageColor.value = 'red'
  } finally {
    addingTicket.value = false
  }
}

onMounted(async () => {
  await fetchTickets()
})
</script>

<template>
  <div class="container">
    <h1>Gestion des tickets pour l'événement {{ eventId }}</h1>
    
    <!-- Formulaire d'ajout d'un type de ticket -->
    <section class="add-ticket">
      <h2>Ajouter un type de ticket</h2>
      <form @submit.prevent="addTicketType">
        <div class="form-group">
          <label for="ticketName">Nom du ticket</label>
          <input id="ticketName" v-model="ticketName" type="text" placeholder="Nom du ticket" required>
        </div>
        <div class="form-group">
          <label for="ticketDescription">Description</label>
          <textarea id="ticketDescription" v-model="ticketDescription" placeholder="Description du ticket"/>
        </div>
        <div class="form-group">
          <label for="ticketPrice">Prix</label>
          <input id="ticketPrice" v-model.number="ticketPrice" type="number" step="0.01" placeholder="Prix du ticket" required>
        </div>
        <div class="form-group">
          <label for="maxPerOrder">Quantité max par commande (optionnel)</label>
          <input id="maxPerOrder" v-model.number="maxPerOrder" type="number" placeholder="Quantité max">
        </div>
        <button type="submit" :disabled="addingTicket">
          {{ addingTicket ? 'Ajout en cours…' : 'Ajouter le ticket' }}
        </button>
        <p v-if="message" :style="{ color: messageColor }">{{ message }}</p>
      </form>
    </section>

    <!-- Liste des types de tickets existants -->
    <section class="ticket-list">
      <h2>Types de tickets existants</h2>
      <div v-if="loadingTickets">
        <p>Chargement des tickets…</p>
      </div>
      <div v-else-if="tickets.length">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Description</th>
              <th>Prix</th>
              <th>Max par commande</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ticket in tickets" :key="ticket.id">
              <td>{{ ticket.name }}</td>
              <td>{{ ticket.description }}</td>
              <td>{{ ticket.price }} {{ ticket.currency }}</td>
              <td>{{ ticket.max_per_order || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else>
        <p>Aucun type de ticket n'a été ajouté pour cet événement.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
  font-family: sans-serif;
}
.add-ticket, .ticket-list {
  margin-bottom: 2rem;
  background-color: #fff;
  padding: 1rem;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}
input, textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  padding: 0.75rem 1.5rem;
  background-color: #6772e5;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
th, td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}
</style>
