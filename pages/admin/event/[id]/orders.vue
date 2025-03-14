<!-- pages/admin/event/[id]/orders.vue -->
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

const orders = ref([])
const loadingOrders = ref(false)
const message = ref('')
const messageColor = ref('green')

async function fetchOrders() {
  loadingOrders.value = true
  try {
    // On récupère les orders où entity_type est "event" et entity_id correspond à l'ID de l'événement
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('entity_type', 'event')
      .eq('entity_id', eventId)
    if (error) {
      console.error('Erreur lors de la récupération des orders:', error)
      message.value = error.message
      messageColor.value = 'red'
    } else {
      orders.value = data
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des orders:', err)
    message.value = 'Erreur inattendue'
    messageColor.value = 'red'
  } finally {
    loadingOrders.value = false
  }
}

onMounted(async () => {
  await fetchOrders()
})
</script>

<template>
  <div class="container">
    <h1>Orders pour l'événement {{ eventId }}</h1>
    <div v-if="loadingOrders">
      <p>Chargement des orders…</p>
    </div>
    <div v-else-if="orders.length">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Total</th>
            <th>Currency</th>
            <th>Date</th>
            <th>Provider Order ID</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.id }}</td>
            <td>{{ order.status }}</td>
            <td>{{ order.total_amount }}</td>
            <td>{{ order.currency }}</td>
            <td>{{ order.created_at }}</td>
            <td>{{ order.provider_order_id || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>
      <p>Aucune order trouvée pour cet événement.</p>
    </div>
    <p v-if="message" :style="{ color: messageColor }">{{ message }}</p>
  </div>
</template>

<style scoped>
.container {
  max-width: 900px;
  margin: 2rem auto;
  padding: 1rem;
  font-family: sans-serif;
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
