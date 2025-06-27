<!-- pages/admin/event/[id]/orders.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabaseClient } from '#imports'
import { useEntityPermission } from '~/composables/useEntityPermission'

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

// Gestion permission centralisée
const { currentUserPermission, fetchPermission } = useEntityPermission(eventId, 'event')

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

onMounted(async () => {
  await fetchPermission()
  await fetchOrders()
})

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

function exportOrdersToCSV() {
  if (!orders.value.length) return;
  const headers = [
    'ID Commande',
    'Statut',
    'Email Acheteur',
    'Total',
    'Devise',
    'Date'
  ];
  const rows = orders.value.map(order => [
    order.id,
    order.status,
    order.buyer_email || '',
    order.total_amount,
    order.currency,
    order.created_at
  ]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `commandes_event_${eventId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-1">Commandes</h1>
          <p class="text-sm text-gray-600">Liste des commandes pour l'événement.</p>
        </div>
        <!-- Bouton d'export visible pour tous les niveaux de permission -->
        <button
          aria-label="Exporter les commandes en CSV"
          class="btn flex items-center gap-2"
          @click="exportOrdersToCSV"
        >
          <svg class="w-5 h-5 text-base-content" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4" />
            <rect x="4" y="18" width="16" height="2" rx="1" />
          </svg>
          Exporter CSV
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loadingOrders" class="flex items-center justify-center py-24">
        <span class="loading loading-spinner loading-lg text-primary" aria-label="Chargement" />
        <p class="ml-4 text-lg text-gray-600">Chargement des commandes...</p>
      </div>

      <!-- Error Message -->
      <div v-else-if="error" class="alert alert-error flex items-center gap-4">
        <svg class="h-8 w-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-lg font-semibold">Une erreur est survenue</h3>
          <p class="text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>

      <!-- Orders Table -->
      <div v-else-if="orders.length" class="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th>ID Commande</th>
                <th>Statut</th>
                <th>Email Acheteur</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in paginatedOrders"
                :key="order.id"
                :class="['hover:bg-base-200 cursor-pointer transition-colors duration-200']"
                aria-disabled="currentUserPermission < 2"
                tabindex="0"
                @click="navigateToOrder(order.id)"
              >
                <td class="font-mono">
                  <div class="relative group flex items-center">
                    <span :title="order.id">{{ order.id }}</span>
                    <button
                      :aria-label="`Copier l'ID ${order.id}`"
                      :disabled="currentUserPermission < 2"
                      :tabindex="currentUserPermission < 2 ? -1 : 0"
                      class="btn btn-xs btn-ghost ml-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 transition-opacity duration-200"
                      @click.stop="copyToClipboard(order.id, order.id)"
                    >
                      <span v-if="copiedValue === order.id" class="text-success text-xs font-semibold">Copié!</span>
                      <span v-else>
                        <svg class="w-4 h-4 text-base-content" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                      </span>
                    </button>
                  </div>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="{
                      'badge-success': ['succeeded', 'paid'].includes(order.status),
                      'badge-warning': ['pending'].includes(order.status),
                      'badge-error': ['failed', 'canceled'].includes(order.status),
                      'badge-info': ['refunded'].includes(order.status),
                      'badge-ghost': !['succeeded', 'paid', 'pending', 'failed', 'canceled', 'refunded'].includes(order.status)
                    }"
                  >
                    {{ order.status }}
                  </span>
                </td>
                <td>
                  <div v-if="order.buyer_email" class="relative group flex items-center">
                    <span>{{ order.buyer_email }}</span>
                    <button
                      :aria-label="`Copier l'email ${order.buyer_email}`"
                      :disabled="currentUserPermission < 2"
                      :tabindex="currentUserPermission < 2 ? -1 : 0"
                      class="btn btn-xs btn-ghost ml-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 transition-opacity duration-200"
                      @click.stop="copyToClipboard(order.buyer_email, order.buyer_email)"
                    >
                      <span v-if="copiedValue === order.buyer_email" class="text-success text-xs font-semibold">Copié!</span>
                      <span v-else>
                        <svg class="w-4 h-4 text-base-content" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                      </span>
                    </button>
                  </div>
                  <span v-else>-</span>
                </td>
                <td>{{ formatCurrency(order.total_amount, order.currency) }}</td>
                <td>{{ formatDate(order.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between bg-base-100 px-4 py-3 border-t border-base-200"
        >
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              :disabled="currentPage === 1"
              class="btn btn-outline"
              @click="prevPage"
            >
              Précédent
            </button>
            <button
              :disabled="currentPage === totalPages"
              class="btn btn-outline ml-3"
              @click="nextPage"
            >
              Suivant
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-base-content">
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
              <nav class="relative z-0 inline-flex rounded-md shadow-sm gap-2" aria-label="Pagination">
                <button
                  :disabled="currentPage === 1"
                  class="btn btn-square btn-outline"
                  @click="prevPage"
                >
                  <span class="sr-only">Précédent</span>
                  <svg class="w-5 h-5 text-base-content" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <button
                  :disabled="currentPage === totalPages"
                  class="btn btn-square btn-outline"
                  @click="nextPage"
                >
                  <span class="sr-only">Suivant</span>
                  <svg class="w-5 h-5 text-base-content" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <!-- No Orders Found -->
      <div v-else class="text-center py-24">
        <span class="icon-[mdi--file-document-outline] mx-auto h-12 w-12 text-base-content/40" aria-hidden="true" />
        <h3 class="mt-2 text-sm font-medium text-base-content">Aucune commande</h3>
        <p class="mt-1 text-sm text-base-content/60">Aucune commande n'a été trouvée pour cet événement.</p>
      </div>
    </div>
  </div>
</template>


