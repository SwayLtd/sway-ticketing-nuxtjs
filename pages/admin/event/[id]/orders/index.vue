<!-- pages/admin/event/[id]/orders.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
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
const loadingOrders = ref(true)
const error = ref(null)
const copiedValue = ref(null) // Pour suivre l'ID ou l'email copié

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10

const totalPages = computed(() => {
  return Math.ceil(orders.value.length / itemsPerPage)
})

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return orders.value.slice(start, end)
})

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

async function fetchOrders() {
  loadingOrders.value = true
  error.value = null
  try {
    const { data, error: supabaseError } = await supabase
      .from('orders')
      .select('*')
      .eq('entity_type', 'event')
      .eq('entity_id', eventId)
      .order('created_at', { ascending: false })

    if (supabaseError) {
      throw supabaseError
    }
    orders.value = data
  } catch (err) {
    console.error('Erreur lors de la récupération des orders:', err)
    error.value = 'Une erreur est survenue lors de la récupération des commandes. Veuillez réessayer.'
  } finally {
    loadingOrders.value = false
  }
}

onMounted(fetchOrders)

function copyToClipboard(text, value) {
  navigator.clipboard.writeText(text).then(() => {
    copiedValue.value = value
    setTimeout(() => {
      copiedValue.value = null
    }, 2000) // Le message "Copié!" disparaît après 2 secondes
  }).catch(err => {
    console.error('Impossible de copier le texte: ', err)
  })
}

function formatCurrency(amount, currency) {
  if (typeof amount !== 'number' || !currency) {
    return '-'
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function navigateToOrder(orderId) {
  return navigateTo(`/admin/event/${eventId}/orders/${orderId}`)
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-1">Commandes</h1>
        <p class="text-sm text-gray-600">Liste des commandes pour l'événement.</p>
      </div>

      <!-- Loading State -->
      <div v-if="loadingOrders" class="flex items-center justify-center py-24">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p class="ml-4 text-lg text-gray-600">Chargement des commandes...</p>
      </div>

      <!-- Error Message -->
      <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg shadow-md">
        <div class="flex items-center">
          <svg class="h-8 w-8 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold text-red-800">Une erreur est survenue</h3>
            <p class="text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Orders Table -->
      <div v-else-if="orders.length" class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Commande</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Acheteur
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="order in paginatedOrders" :key="order.id"
                @click="navigateToOrder(order.id)"
                class="hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                  <div class="relative group flex items-center">
                    <span :title="order.id">{{ order.id }}</span>
                    <button @click.stop="copyToClipboard(order.id, order.id)"
                      class="ml-2 p-1 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      :aria-label="`Copier l'ID ${order.id}`">
                      <span v-if="copiedValue === order.id" class="text-green-600 text-xs font-semibold">Copié!</span>
                      <svg v-else class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        title="Copier l'ID complet">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="{
                    'px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full': true,
                    'bg-green-100 text-green-800': ['succeeded', 'paid'].includes(order.status),
                    'bg-yellow-100 text-yellow-800': ['pending'].includes(order.status),
                    'bg-red-100 text-red-800': ['failed', 'canceled'].includes(order.status),
                    'bg-gray-100 text-gray-800': !['succeeded', 'paid', 'pending', 'failed', 'canceled'].includes(order.status)
                  }">
                    {{ order.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div v-if="order.buyer_email" class="relative group flex items-center">
                    <span>{{ order.buyer_email }}</span>
                    <button @click.stop="copyToClipboard(order.buyer_email, order.buyer_email)"
                      class="ml-2 p-1 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      :aria-label="`Copier l'email ${order.buyer_email}`">
                      <span v-if="copiedValue === order.buyer_email"
                        class="text-green-600 text-xs font-semibold">Copié!</span>
                      <svg v-else class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        title="Copier l'email">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <span v-else>-</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{
                  formatCurrency(order.total_amount, order.currency) }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(order.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1"
          class="flex items-center justify-between bg-white px-4 py-3 sm:px-6 border-t border-gray-200">
          <div class="flex-1 flex justify-between sm:hidden">
            <button @click="prevPage" :disabled="currentPage === 1"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Précédent
            </button>
            <button @click="nextPage" :disabled="currentPage === totalPages"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Suivant
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Affichage de
                <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
                à
                <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, orders.length) }}</span>
                sur
                <span class="font-medium">{{ orders.length }}</span>
                résultats
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button @click="prevPage" :disabled="currentPage === 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span class="sr-only">Précédent</span>
                  <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                    aria-hidden="true">
                    <path fill-rule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clip-rule="evenodd" />
                  </svg>
                </button>
                <button @click="nextPage" :disabled="currentPage === totalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span class="sr-only">Suivant</span>
                  <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                    aria-hidden="true">
                    <path fill-rule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <!-- No Orders Found -->
      <div v-else class="text-center py-24">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"
          aria-hidden="true">
          <path vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Aucune commande</h3>
        <p class="mt-1 text-sm text-gray-500">Aucune commande n'a été trouvée pour cet événement.</p>
      </div>
    </div>
  </div>
</template>


