<!-- pages/admin/event/[id]/tickets.vue -->
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabaseClient } from '#imports'
import AdminNotification from '~/components/admin/AdminNotification.vue'
import { useEntityPermission } from '~/composables/useEntityPermission'

definePageMeta({
  layout: 'admin-event'
})

const supabase = useSupabaseClient()
const route = useRoute()
// D'abord récupérer l'ID de l'événement depuis l'URL
const eventId = route.params.id
// Puis utiliser eventId dans le composable permission
const { currentUserPermission, fetchPermission } = useEntityPermission(eventId, 'event')

// Variables pour le formulaire d'ajout
const ticketName = ref('')
const ticketDescription = ref('')
const ticketPrice = ref(0)
const maxPerOrder = ref(null)
const ticketStock = ref(null)
const ticketActive = ref(true)
const currency = ref('EUR') // valeur par défaut

// Variables pour la liste des tickets existants
const tickets = ref([])
const loadingTickets = ref(false)
const addingTicket = ref(false)

// Variables pour l'édition et la suppression
const editingTicket = ref(null)
const deletingTicket = ref(null)
const showDeleteModal = ref(false)
const showEditModal = ref(false)

// Variables pour les statistiques
const ticketStats = ref({})
const loadingStats = ref(false)

// Variables pour les notifications
const notifications = ref([])

// Variables pour les fonctionnalités supplémentaires
const showStockModal = ref(false)
const stockTicket = ref(null)
const newStock = ref(0)
const showBulkActions = ref(false)
const selectedTickets = ref([])
const exportingData = ref(false)

// Variables pour le modal d'ajout
const showAddModal = ref(false)

// Variables pour les filtres avancés
const showFilterSidebar = ref(false)
const filters = ref({
  status: 'all', // 'all', 'active', 'inactive'
  stock: 'all', // 'all', 'low', 'out', 'unlimited'
  salesRange: [0, 100] // Range pour le nombre de ventes, sera mis à jour dynamiquement
})

// Variables pour le tri
const sortBy = ref('created_at')
const sortDirection = ref('desc')

// Variables pour la recherche
const searchTerm = ref('')

// Limite de 20 types de tickets par événement
const MAX_TICKETS = 20

// Computed property pour vérifier si la limite est atteinte
const isTicketLimitReached = computed(() => {
  return tickets.value.length >= MAX_TICKETS
})

// Fonction pour afficher une notification de limite atteinte
function showLimitReachedNotification() {
  showNotification({
    type: 'warning',
    title: 'Limite atteinte',
    message: `Vous avez atteint la limite de ${MAX_TICKETS} types de tickets par événement.`
  })
}

// Fonction pour récupérer les types de tickets pour cet événement
async function fetchTickets() {
  loadingTickets.value = true
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('entity_type', 'event')
      .eq('entity_id', eventId).order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur lors de la récupération des tickets:', error)
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Erreur lors de la récupération des tickets.'
      })
    } else {
      tickets.value = data
      await fetchTicketStats()
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des tickets:', err)
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Une erreur inattendue est survenue.'
    })
  } finally {
    loadingTickets.value = false
  }
}

// Fonction pour récupérer les statistiques des tickets
async function fetchTicketStats() {
  if (!tickets.value.length) return

  loadingStats.value = true
  try {
    const ticketIds = tickets.value.map(t => t.id)
    const { data, error } = await supabase
      .from('order_products')
      .select(`
        product_id,
        quantity,
        orders!inner(status)
      `)
      .in('product_id', ticketIds)
      .in('orders.status', ['completed', 'paid'])

    if (!error && data) {
      const stats = {}
      data.forEach(item => {
        if (!stats[item.product_id]) {
          stats[item.product_id] = { sold: 0, revenue: 0 }
        }
        stats[item.product_id].sold += item.quantity
      })

      // Calculer le chiffre d'affaires
      tickets.value.forEach(ticket => {
        if (stats[ticket.id]) {
          stats[ticket.id].revenue = stats[ticket.id].sold * ticket.price
        }
      })

      ticketStats.value = stats
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des statistiques:', err)
  } finally {
    loadingStats.value = false
  }
}

// Fonction pour ajouter un nouveau type de ticket (modal)
async function addTicketTypeModal() {
  // Vérifier que le champ nom n'est pas vide
  if (!ticketName.value.trim()) {
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Le nom du ticket est requis.'
    })
    return
  }
  // Vérifier si la limite de tickets est atteinte
  if (isTicketLimitReached.value) {
    showLimitReachedNotification()
    return
  }
  addingTicket.value = true
  try {
    const { error } = await supabase
      .from('products').insert([{
        name: ticketName.value,
        description: ticketDescription.value,
        price: ticketPrice.value,
        currency: currency.value,
        entity_type: 'event',
        entity_id: eventId,
        max_per_order: maxPerOrder.value,
        stock: ticketStock.value,
        active: ticketActive.value
      }])
    if (error) {
      console.error('Erreur lors de l\'ajout du ticket:', error)
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: error.message
      })
    } else {
      showNotification({
        type: 'success',
        title: 'Succès',
        message: 'Type de ticket ajouté avec succès.'
      })
      closeAddModal()
      // Rafraîchir la liste
      await fetchTickets()
    }
  } catch (err) {
    console.error('Erreur lors de l\'ajout du ticket:', err)
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Erreur inattendue'
    })
  } finally {
    addingTicket.value = false
  }
}

function formatCurrency(amount, currency) {
  if (typeof amount !== 'number' || !currency) {
    return '-'
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency.toUpperCase() }).format(amount)
}

// Fonction pour formater le prix avec deux décimales
function formatPrice(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = parseFloat(value)
  if (isNaN(num)) return '0.00'
  return num.toFixed(2)
}

// Fonction pour gérer la saisie du prix et limiter à deux décimales
function formatPriceInput(type) {
  const inputElement = document.getElementById(type === 'add' ? 'modalTicketPrice' : 'editTicketPrice')
  if (!inputElement) return

  let value = inputElement.value

  // Supprimer tous les caractères non numériques sauf le point et les chiffres
  value = value.replace(/[^0-9.]/g, '')

  // S'assurer qu'il n'y a qu'un seul point
  const parts = value.split('.')
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('')
  }

  // Limiter à deux décimales
  if (parts.length === 2 && parts[1].length > 2) {
    value = parts[0] + '.' + parts[1].substring(0, 2)
  }

  // Mettre à jour la valeur dans l'input
  inputElement.value = value

  // Mettre à jour la variable réactive
  const numValue = parseFloat(value) || 0
  if (type === 'add') {
    ticketPrice.value = numValue
  } else {
    editingTicket.value.price = numValue
  }
}

// Fonctions pour l'édition
function startEditTicket(ticket) {
  editingTicket.value = { ...ticket }
  showEditModal.value = true
}

async function updateTicket() {
  if (!editingTicket.value || !editingTicket.value.name.trim()) {
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Le nom du ticket est requis.'
    })
    return
  }

  try {
    const { error } = await supabase
      .from('products').update({
        name: editingTicket.value.name,
        description: editingTicket.value.description,
        price: editingTicket.value.price,
        currency: editingTicket.value.currency,
        max_per_order: editingTicket.value.max_per_order,
        stock: editingTicket.value.stock,
        active: editingTicket.value.active
      })
      .eq('id', editingTicket.value.id)

    if (error) {
      console.error('Erreur lors de la modification du ticket:', error)
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: error.message
      })
    } else {
      showNotification({
        type: 'success',
        title: 'Succès',
        message: 'Ticket modifié avec succès.'
      })
      showEditModal.value = false
      editingTicket.value = null
      await fetchTickets()
    }
  } catch (err) {
    console.error('Erreur lors de la modification du ticket:', err)
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Erreur inattendue'
    })
  }
}

function cancelEdit() {
  editingTicket.value = null
  showEditModal.value = false
}

// Fonctions pour la suppression
function startDeleteTicket(ticket) {
  deletingTicket.value = ticket
  showDeleteModal.value = true
}

async function deleteTicket() {
  if (!deletingTicket.value) return
  try {
    // Vérifier si le ticket a des commandes
    const { data: orderData, error: orderError } = await supabase
      .from('order_products')
      .select('id')
      .eq('product_id', deletingTicket.value.id)
      .limit(1)

    if (orderError) {
      console.error('Erreur lors de la vérification des commandes:', orderError)
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Erreur lors de la vérification des commandes.'
      })
      return
    }

    if (orderData && orderData.length > 0) {
      showNotification({
        type: 'error',
        title: 'Suppression impossible',
        message: 'Impossible de supprimer ce ticket car il y a des commandes associées.'
      })
      showDeleteModal.value = false
      deletingTicket.value = null
      return
    }

    // Supprimer le ticket
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deletingTicket.value.id)

    if (error) {
      console.error('Erreur lors de la suppression du ticket:', error)
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: error.message
      })
    } else {
      showNotification({
        type: 'success',
        title: 'Succès',
        message: 'Ticket supprimé avec succès.'
      })
      showDeleteModal.value = false
      deletingTicket.value = null
      await fetchTickets()
    }
  } catch (err) {
    console.error('Erreur lors de la suppression du ticket:', err)
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Erreur inattendue'
    })
  }
}

function cancelDelete() {
  deletingTicket.value = null
  showDeleteModal.value = false
}

// Fonction pour dupliquer un ticket
async function duplicateTicket(ticket) {
  // Vérifier si la limite de tickets est atteinte
  if (isTicketLimitReached.value) {
    showLimitReachedNotification()
    return
  }

  try {
    const { error } = await supabase
      .from('products')
      .insert([{
        name: `${ticket.name} (Copie)`,
        description: ticket.description,
        price: ticket.price,
        currency: ticket.currency,
        entity_type: 'event',
        entity_id: eventId,
        max_per_order: ticket.max_per_order,
        stock: ticket.stock,
        active: ticket.active
      }])

    if (error) {
      console.error('Erreur lors de la duplication du ticket:', error)
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: error.message
      })
    } else {
      showNotification({
        type: 'success',
        title: 'Succès',
        message: 'Ticket dupliqué avec succès.'
      })
      await fetchTickets()
    }
  } catch (err) {
    console.error('Erreur lors de la duplication du ticket:', err)
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Erreur inattendue'
    })
  }
}

// Fonctions pour gérer le stock
function startStockManagement(ticket) {
  stockTicket.value = { ...ticket }
  newStock.value = ticket.stock || 0
  showStockModal.value = true
}

async function updateStock() {
  if (!stockTicket.value) return

  try {
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock.value })
      .eq('id', stockTicket.value.id)

    if (error) {
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: error.message
      })
    } else {
      showNotification({
        type: 'success',
        title: 'Succès',
        message: 'Stock mis à jour avec succès.'
      })
      showStockModal.value = false
      stockTicket.value = null
      await fetchTickets()
    }
  } catch (err) {
    console.error('Erreur lors de la mise à jour du stock:', err)
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Erreur inattendue'
    })
  }
}

function cancelStock() {
  showStockModal.value = false
  stockTicket.value = null
}

// Fonction pour ajouter du stock rapidement
async function quickAddStock(ticket, amount = 10) {
  try {
    const currentStock = ticket.stock || 0
    const newStock = currentStock + amount

    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', ticket.id)

    if (error) {
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: error.message
      })
    } else {
      showNotification({
        type: 'success',
        title: 'Stock ajouté',
        message: `${amount} tickets ajoutés au stock (${newStock} total).`
      })
      await fetchTickets()
    }
  } catch (err) {
    console.error('Erreur lors de l\'ajout rapide de stock:', err)
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Erreur inattendue'
    })
  }
}

// Fonction pour exporter les données
async function exportTicketsData() {
  exportingData.value = true
  try {
    const csvData = tickets.value.map(ticket => {
      const stats = ticketStats.value[ticket.id] || { sold: 0, revenue: 0 }
      return {
        'Nom': ticket.name,
        'Description': ticket.description || '',
        'Prix': ticket.price,
        'Devise': ticket.currency,
        'Stock': ticket.stock || 'Illimité',
        'Max par commande': ticket.max_per_order || 'Illimité',
        'Vendus': stats.sold,
        'Chiffre d\'affaires': stats.revenue,
        'Créé le': new Date(ticket.created_at).toLocaleDateString('fr-FR')
      }
    })

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickets-event-${eventId}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    showNotification({
      type: 'success',
      title: 'Export réussi',
      message: 'Les données ont été exportées avec succès.'
    })
  } catch (err) {
    console.error('Erreur lors de l\'export:', err)
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Erreur lors de l\'export des données.'
    })
  } finally {
    exportingData.value = false
  }
}

// Fonction pour activer/désactiver un ticket
async function toggleTicketStatus(ticket) {
  try {
    const newStatus = !ticket.active
    const { error } = await supabase
      .from('products')
      .update({ active: newStatus })
      .eq('id', ticket.id)

    if (error) {
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: error.message
      })
    } else {
      showNotification({
        type: 'success',
        title: 'Succès',
        message: `Ticket ${newStatus ? 'activé' : 'désactivé'} avec succès.`
      })
      await fetchTickets()
    }
  } catch (err) {
    console.error('Erreur lors du changement de statut:', err)
    showNotification({
      type: 'error',
      title: 'Erreur',
      message: 'Erreur inattendue'
    })
  }
}

// Fonction pour calculer les insights
const ticketInsights = computed(() => {
  if (!tickets.value.length) return null

  const totalTickets = tickets.value.length
  const activeTickets = tickets.value.filter(t => t.active !== false).length
  const totalRevenue = Object.values(ticketStats.value).reduce((sum, stat) => sum + stat.revenue, 0)
  const totalSold = Object.values(ticketStats.value).reduce((sum, stat) => sum + stat.sold, 0)

  const bestSeller = tickets.value.reduce((best, current) => {
    const currentSold = ticketStats.value[current.id]?.sold || 0
    const bestSold = ticketStats.value[best.id]?.sold || 0
    return currentSold > bestSold ? current : best
  }, tickets.value[0])

  return {
    totalTickets,
    activeTickets,
    totalRevenue,
    totalSold,
    bestSeller,
    averagePrice: tickets.value.reduce((sum, t) => sum + t.price, 0) / totalTickets
  }
})

// Fonction pour filtrer les tickets avec filtres avancés
const filteredTickets = computed(() => {
  let filtered = tickets.value

  // Filtre par terme de recherche
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter(ticket =>
      ticket.name.toLowerCase().includes(term) ||
      (ticket.description && ticket.description.toLowerCase().includes(term))
    )
  }

  // Filtre par statut
  if (filters.value.status === 'active') {
    filtered = filtered.filter(ticket => ticket.active !== false)
  } else if (filters.value.status === 'inactive') {
    filtered = filtered.filter(ticket => ticket.active === false)
  }

  // Filtre par stock
  if (filters.value.stock === 'low') {
    filtered = filtered.filter(ticket => ticket.stock && ticket.stock <= 10)
  } else if (filters.value.stock === 'out') {
    filtered = filtered.filter(ticket => ticket.stock === 0)
  } else if (filters.value.stock === 'unlimited') {
    filtered = filtered.filter(ticket => !ticket.stock)
  }  // Filtre par ventes - le range slider est toujours appliqué
  filtered = filtered.filter(ticket => {
    const sold = ticketStats.value[ticket.id]?.sold || 0
    return sold >= filters.value.salesRange[0] && sold <= filters.value.salesRange[1]
  })

  // Tri
  filtered.sort((a, b) => {
    let aValue, bValue

    switch (sortBy.value) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'price':
        aValue = a.price
        bValue = b.price
        break
      case 'stock':
        aValue = a.stock || 999999
        bValue = b.stock || 999999
        break
      case 'sold':
        aValue = ticketStats.value[a.id]?.sold || 0
        bValue = ticketStats.value[b.id]?.sold || 0
        break
      case 'created_at':
      default:
        aValue = new Date(a.created_at)
        bValue = new Date(b.created_at)
        break
    }

    if (aValue < bValue) return sortDirection.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection.value === 'asc' ? 1 : -1
    return 0
  })

  return filtered
})

// Fonctions de tri
function sortTable(column) {
  if (sortBy.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortDirection.value = 'asc'
  }
}

// Fonctions pour gérer la validation du range
function updateMinRange(value) {
  if (value > filters.value.salesRange[1]) {
    filters.value.salesRange[1] = value
  }
}

function updateMaxRange(value) {
  if (value < filters.value.salesRange[0]) {
    filters.value.salesRange[0] = value
  }
}

// Fonction pour calculer le maximum dynamique basé sur les ventes
const maxSalesRange = computed(() => {
  if (!tickets.value.length || !Object.keys(ticketStats.value).length) return 100

  const maxSold = Math.max(...Object.values(ticketStats.value).map(stat => stat.sold || 0))

  if (maxSold <= 0) return 50
  if (maxSold <= 20) return Math.ceil(maxSold / 10) * 10 + 10 // Arrondi à la dizaine au-dessus
  if (maxSold <= 100) return Math.ceil(maxSold / 10) * 10 + 20 // Arrondi à la dizaine au-dessus + 20
  return Math.ceil(maxSold / 100) * 100 + 100 // Arrondi à la centaine au-dessus
})

// Fonction pour réinitialiser les filtres
function resetFilters() {
  searchTerm.value = ''
  filters.value = {
    status: 'all',
    stock: 'all',
    salesRange: [0, maxSalesRange.value]
  }
}

// Fonction pour ouvrir le modal d'ajout
function openAddModal() {
  if (isTicketLimitReached.value) {
    showLimitReachedNotification()
    return
  }
  showAddModal.value = true
}

// Fonction pour gérer les clics sur boutons désactivés
function handleDisabledClick() {
  if (isTicketLimitReached.value) {
    showLimitReachedNotification()
  }
}

// Fonction pour fermer le modal d'ajout
function closeAddModal() {
  showAddModal.value = false
  // Réinitialiser le formulaire
  ticketName.value = ''
  ticketDescription.value = ''
  ticketPrice.value = 0
  maxPerOrder.value = null
  ticketStock.value = null
  ticketActive.value = true
}

// Fonctions pour les notifications
function showNotification(notification) {
  const id = Date.now()
  notifications.value.push({ ...notification, id })
}

function removeNotification(id) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

// Watcher pour mettre à jour le range quand les stats changent
watch(ticketStats, (newStats) => {
  if (newStats && Object.keys(newStats).length > 0) {
    // Mettre à jour le maximum du range si nécessaire
    if (filters.value.salesRange[1] < maxSalesRange.value && filters.value.sold === 'range') {
      filters.value.salesRange[1] = Math.min(maxSalesRange.value, filters.value.salesRange[1] * 2)
    }
  }
}, { deep: true })


// --- Gestion metadata event (comme dans settings.vue) ---
const eventInfo = ref(null)
const eventLoading = ref(true)
const eventMetadata = computed(() => {
  const data = eventInfo.value
  if (!data) return { sway_tickets: undefined }
  let loadedMeta = {}
  if (typeof data?.metadata === 'string') {
    try {
      loadedMeta = JSON.parse(data.metadata)
    } catch (e) {
      loadedMeta = {}
    }
  } else if (typeof data?.metadata === 'object' && data.metadata !== null) {
    loadedMeta = data.metadata
  } else {
    loadedMeta = {}
  }
  return { timetable: false, ticket_link: '', sway_tickets: undefined, ...loadedMeta }
})

onMounted(async () => {
  await fetchPermission()
  await fetchTickets()
  // Initialiser le range avec la valeur dynamique après avoir chargé les stats
  filters.value.salesRange = [0, maxSalesRange.value]

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()
  if (!error && data) eventInfo.value = data
  eventLoading.value = false
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <template v-if="eventLoading">
      <div class="flex items-center justify-center min-h-[300px]">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
    </template>
    <template v-else-if="eventMetadata.sway_tickets === true">
      <!-- Header -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-1">Gestion des tickets</h1>
            <p class="text-sm text-gray-600">Ajoutez et gérez les types de tickets pour votre événement.</p>
          </div>
          <div class="flex space-x-3">
            <button :disabled="currentUserPermission < 2 || isTicketLimitReached"
              :class="[currentUserPermission < 2 || isTicketLimitReached ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed btn-disabled opacity-50' : 'bg-blue-600 hover:bg-blue-700', 'inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500']"
              :title="currentUserPermission < 2 ? 'Vous n\'avez pas la permission d\'ajouter un ticket' : (isTicketLimitReached ? `Limite de ${MAX_TICKETS} types de tickets atteinte` : '')"
              @click="(currentUserPermission < 2 || isTicketLimitReached) ? null : openAddModal()">
              <svg class="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un ticket
            </button>
            <button :disabled="exportingData || !tickets.length"
              class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="exportTicketsData">
              <svg v-if="exportingData" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <svg v-else class="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {{ exportingData ? 'Export...' : 'Exporter CSV' }}
            </button>
          </div>
        </div>

        <!-- Insights Panel -->
        <div v-if="ticketInsights && !loadingTickets" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">Total tickets</p>
                <p class="text-2xl font-bold text-gray-900">{{ ticketInsights.totalTickets }}</p>
                <p class="text-sm text-gray-500">{{ ticketInsights.activeTickets }} actifs</p>
              </div>
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2V7a2 2 0 00-2-2H5zM5 11h3a2 2 0 002-2V7a2 2 0 00-2-2H5m12 0a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2V7a2 2 0 00-2-2h-3zm0 4h3a2 2 0 002-2V7a2 2 0 00-2-2h-3" />
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">Tickets vendus</p>
                <p class="text-2xl font-bold text-gray-900">{{ ticketInsights.totalSold }}</p>
                <p class="text-sm text-gray-500">Total</p>
              </div>
              <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
                <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(ticketInsights.totalRevenue, 'EUR') }}</p>
                <p class="text-sm text-gray-500">Total généré</p>
              </div>
              <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">Meilleure vente</p>
                <p class="text-lg font-bold text-gray-900 truncate" :title="ticketInsights.bestSeller?.name">{{
                  ticketInsights.bestSeller?.name || '-' }}</p>
                <p class="text-sm text-gray-500">{{ ticketStats[ticketInsights.bestSeller?.id]?.sold || 0 }} vendus</p>
              </div>
              <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-col xl:flex-row xl:gap-8">
          <!-- Sidebar de filtres avancés (cachée sur mobile par défaut) -->
          <div class="hidden xl:block xl:w-80 xl:flex-shrink-0 order-2 xl:order-1">
            <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-200 sticky top-8">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-lg font-semibold text-gray-800">Filtres avancés</h2>
                <button class="text-sm text-blue-600 hover:text-blue-700 font-medium" @click="resetFilters">
                  Réinitialiser
                </button>
              </div>

              <div class="space-y-6">
                <!-- Filtre par statut -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <div class="space-y-2">
                    <label class="flex items-center">
                      <input v-model="filters.status" type="radio" value="all" class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Tous</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.status" type="radio" value="active"
                        class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Actifs</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.status" type="radio" value="inactive"
                        class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Inactifs</span>
                    </label>
                  </div>
                </div>

                <!-- Filtre par stock -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                  <div class="space-y-2">
                    <label class="flex items-center">
                      <input v-model="filters.stock" type="radio" value="all" class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Tous</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.stock" type="radio" value="unlimited"
                        class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Illimité</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.stock" type="radio" value="low" class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Stock faible (≤10)</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.stock" type="radio" value="out" class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Épuisé</span>
                    </label>
                  </div>
                </div> <!-- Filtre par ventes -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Ventes</label>

                  <!-- Range slider à deux points -->
                  <div class="relative mb-4">
                    <div class="flex items-center justify-between mb-2">
                      <input v-model.number="filters.salesRange[0]" type="number" min="0" :max="filters.salesRange[1]"
                        class="w-16 px-2 py-1 text-xs border rounded" @input="updateMinRange(filters.salesRange[0])">
                      <span class="text-xs text-gray-500">à</span>
                      <input v-model.number="filters.salesRange[1]" type="number" :min="filters.salesRange[0]"
                        :max="maxSalesRange" class="w-16 px-2 py-1 text-xs border rounded"
                        @input="updateMaxRange(filters.salesRange[1])">
                    </div>
                    <div class="relative h-6 flex items-center">
                      <!-- Track de fond -->
                      <div class="w-full h-2 bg-gray-200 rounded-lg" />
                      <!-- Range min -->
                      <input v-model.number="filters.salesRange[0]" type="range" min="0" :max="maxSalesRange"
                        class="absolute w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb"
                        @input="updateMinRange(filters.salesRange[0])">
                      <!-- Range max -->
                      <input v-model.number="filters.salesRange[1]" type="range" min="0" :max="maxSalesRange"
                        class="absolute w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb"
                        @input="updateMaxRange(filters.salesRange[1])">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> <!-- Liste des tickets -->
          <div class="flex-1 order-1 xl:order-2">
            <div class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
              <div class="px-6 py-4 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-medium leading-6 text-gray-900">
                    Types de tickets existants
                    <span class="text-sm font-normal text-gray-500">({{ tickets.length }}/{{ MAX_TICKETS }})</span>
                  </h2>
                  <div class="flex items-center space-x-4">
                    <button
                      class="xl:hidden inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      @click="showFilterSidebar = true">
                      <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                      </svg>
                      Filtres
                    </button>
                    <div class="relative">
                      <input v-model="searchTerm" type="text" placeholder="Rechercher..."
                        class="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Loading State -->
              <div v-if="loadingTickets" class="flex items-center justify-center py-24">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                <p class="ml-4 text-lg text-gray-600">Chargement des tickets...</p>
              </div> <!-- Table -->
              <div v-else-if="tickets.length" class="overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th scope="col"
                          class="group px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[120px] max-w-[200px]"
                          @click="sortTable('name')">
                          <div class="flex items-center space-x-1">
                            <span>Nom</span>
                            <svg v-if="sortBy === 'name'" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor">
                              <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M5 15l7-7 7 7" />
                              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 9l-7 7-7-7" />
                            </svg>
                            <svg v-else class="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" fill="none"
                              viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                          </div>
                        </th>
                        <th scope="col"
                          class="group px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-24"
                          @click="sortTable('price')">
                          <div class="flex items-center space-x-1">
                            <span>Prix</span>
                            <svg v-if="sortBy === 'price'" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor">
                              <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M5 15l7-7 7 7" />
                              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 9l-7 7-7-7" />
                            </svg>
                            <svg v-else class="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" fill="none"
                              viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                          </div>
                        </th>
                        <th scope="col"
                          class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Statut
                        </th>
                        <th scope="col"
                          class="group px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-20"
                          @click="sortTable('stock')">
                          <div class="flex items-center justify-center space-x-1">
                            <span>Stock</span>
                            <svg v-if="sortBy === 'stock'" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor">
                              <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M5 15l7-7 7 7" />
                              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 9l-7 7-7-7" />
                            </svg>
                            <svg v-else class="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" fill="none"
                              viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                          </div>
                        </th>
                        <th scope="col"
                          class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 hidden sm:table-cell">
                          Max
                          /
                          Commande</th>
                        <th scope="col"
                          class="group px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-24"
                          @click="sortTable('sold')">
                          <div class="flex items-center justify-center space-x-1">
                            <span>Vendus</span>
                            <svg v-if="sortBy === 'sold'" class="w-4 h-4" fill="none" viewBox="0 0 24 24"
                              stroke="currentColor">
                              <path v-if="sortDirection === 'asc'" stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="2" d="M5 15l7-7 7 7" />
                              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 9l-7 7-7-7" />
                            </svg>
                            <svg v-else class="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" fill="none"
                              viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                          </div>
                        </th>
                        <th scope="col"
                          class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <tr v-for="ticket in filteredTickets" :key="ticket.id" class="hover:bg-gray-50">
                        <td class="px-4 py-4 min-w-[120px] max-w-[200px]">
                          <div>
                            <div class="text-sm font-medium text-gray-900 truncate">{{ ticket.name }}</div>
                            <div v-if="ticket.description"
                              class="text-sm text-gray-500 mt-1 relative group cursor-help">
                              <div class="truncate">
                                {{ ticket.description.length > 30 ? ticket.description.substring(0, 30) + '...' :
                                  ticket.description }}
                              </div>
                              <!-- Tooltip pour la description complète -->
                              <div v-if="ticket.description.length > 30"
                                class="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded-lg px-3 py-2 bottom-full left-0 mb-2 min-w-max max-w-xs shadow-lg">
                                {{ ticket.description }}
                                <div
                                  class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatCurrency(ticket.price,
                          ticket.currency) }}</td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          <span v-if="ticket.active !== false"
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Actif
                          </span>
                          <span v-else
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inactif
                          </span>
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {{ ticket.stock || '∞' }}
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center hidden sm:table-cell">
                          {{
                            ticket.max_per_order ||
                            '∞' }}</td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          <span v-if="loadingStats" class="text-gray-400">...</span>
                          <span v-else-if="ticketStats[ticket.id]" class="font-medium text-gray-900">
                            {{ ticketStats[ticket.id].sold }}
                            <span class="text-xs text-gray-500 block">
                              {{ formatCurrency(ticketStats[ticket.id].revenue, ticket.currency) }}
                            </span>
                          </span>
                          <span v-else class="text-gray-400">0</span>
                        </td>
                        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          <div class="flex items-center justify-center space-x-1">
                            <!-- Activer/Désactiver -->
                            <button :disabled="currentUserPermission < 2" :class="['btn btn-sm btn-ghost',
                              ticket.active !== false ? 'text-orange-600' : 'text-green-600',
                              currentUserPermission < 2 ? 'btn-disabled opacity-50 cursor-not-allowed' : '',
                            ]" :title="ticket.active !== false ? 'Désactiver' : 'Activer'"
                              aria-disabled="currentUserPermission < 2"
                              @click="currentUserPermission < 2 ? null : toggleTicketStatus(ticket)">
                              <svg v-if="ticket.active !== false" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                              </svg>
                              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <!-- Gérer le stock -->
                            <button :disabled="currentUserPermission < 2"
                              :class="['btn btn-sm btn-ghost', 'text-purple-600', currentUserPermission < 2 ? 'btn-disabled opacity-50 cursor-not-allowed' : '']"
                              title="Gérer le stock" aria-disabled="currentUserPermission < 2"
                              @click="currentUserPermission < 2 ? null : startStockManagement(ticket)">
                              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </button>
                            <!-- Modifier -->
                            <button :disabled="currentUserPermission < 2"
                              :class="['btn btn-sm btn-ghost', 'text-blue-600', currentUserPermission < 2 ? 'btn-disabled opacity-50 cursor-not-allowed' : '']"
                              title="Modifier" aria-disabled="currentUserPermission < 2"
                              @click="currentUserPermission < 2 ? null : startEditTicket(ticket)">
                              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <!-- Dupliquer -->
                            <button :disabled="currentUserPermission < 2 || isTicketLimitReached" :class="['btn btn-sm btn-ghost',
                              isTicketLimitReached ? 'text-gray-400' : 'text-green-600',
                              (currentUserPermission < 2 || isTicketLimitReached) ? 'btn-disabled opacity-50 cursor-not-allowed' : '',
                              'hidden sm:block'
                            ]"
                              :title="isTicketLimitReached ? `Limite de ${MAX_TICKETS} types de tickets atteinte` : 'Dupliquer'"
                              aria-disabled="currentUserPermission < 2 || isTicketLimitReached"
                              @click="(currentUserPermission < 2 || isTicketLimitReached) ? handleDisabledClick() : duplicateTicket(ticket)">
                              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <!-- Supprimer -->
                            <button :disabled="currentUserPermission < 2"
                              :class="['btn btn-sm btn-ghost', 'text-red-600', currentUserPermission < 2 ? 'btn-disabled opacity-50 cursor-not-allowed' : '']"
                              title="Supprimer" aria-disabled="currentUserPermission < 2"
                              @click="currentUserPermission < 2 ? null : startDeleteTicket(ticket)">
                              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div><!-- No Tickets Found -->
              <div v-else-if="tickets.length && !filteredTickets.length" class="text-center py-24 px-6">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Aucun résultat</h3>
                <p class="mt-1 text-sm text-gray-500">Aucun ticket ne correspond à vos critères de recherche et filtres.
                </p>
                <button
                  class="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  @click="resetFilters">
                  Réinitialiser les filtres
                </button>
              </div>

              <!-- No Tickets at all -->
              <div v-else class="text-center py-24 px-6">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2V7a2 2 0 00-2-2H5zM5 11h3a2 2 0 002-2V7a2 2 0 00-2-2H5m12 0a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2V7a2 2 0 00-2-2h-3zm0 4h3a2 2 0 002-2V7a2 2 0 00-2-2h-3" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Aucun ticket</h3>
                <p class="mt-1 text-sm text-gray-500">Commencez par ajouter un type de ticket en utilisant le
                  formulaire.
                </p>
              </div>
            </div>
          </div>
        </div> <!-- Modal d'ajout de ticket -->
        <div v-if="showAddModal"
          class="fixed inset-0 bg-gray-500/30 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
          @click.self="closeAddModal">
          <div class="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white m-4" @click.stop>
            <div class="mt-3">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">Ajouter un type de ticket</h3>
                <button class="text-gray-400 hover:text-gray-600" @click="closeAddModal">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form class="space-y-4" @submit.prevent="addTicketTypeModal">
                <div>
                  <label for="modalTicketName" class="block text-sm font-medium text-gray-700">Nom du ticket</label>
                  <input id="modalTicketName" v-model="ticketName" type="text" placeholder="Ex: Billet Standard"
                    required
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
                <div>
                  <label for="modalTicketDescription"
                    class="block text-sm font-medium text-gray-700">Description</label>
                  <textarea id="modalTicketDescription" v-model="ticketDescription"
                    placeholder="Description (optionnel)" rows="3" maxlength="240"
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  <p class="text-xs text-gray-500 mt-1">{{ ticketDescription.length }}/240 caractères</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="modalTicketPrice" class="block text-sm font-medium text-gray-700">Prix (€)</label>
                    <input id="modalTicketPrice" type="number" step="1" min="0" placeholder="25.00" required
                      class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      :value="formatPrice(ticketPrice)" @input="formatPriceInput('add')">
                  </div>
                  <div>
                    <label for="modalCurrency" class="block text-sm font-medium text-gray-700">Devise</label>
                    <select id="modalCurrency" v-model="currency"
                      class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                      <option>EUR</option>
                      <option>USD</option>
                      <option>CHF</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label for="modalMaxPerOrder" class="block text-sm font-medium text-gray-700">Quantité max par
                    commande</label>
                  <input id="modalMaxPerOrder" v-model.number="maxPerOrder" type="number" placeholder="Optionnel"
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
                <div>
                  <label for="modalTicketStock" class="block text-sm font-medium text-gray-700">Stock disponible</label>
                  <input id="modalTicketStock" v-model.number="ticketStock" type="number" placeholder="Illimité si vide"
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <p class="text-xs text-gray-500 mt-1">Laissez vide pour un stock illimité</p>
                </div>
                <div>
                  <label for="modalTicketActive" class="block text-sm font-medium text-gray-700">Statut</label>
                  <select id="modalTicketActive" v-model="ticketActive"
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option :value="true">Actif</option>
                    <option :value="false">Inactif</option>
                  </select>
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                  <button type="button"
                    class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    @click="closeAddModal">
                    Annuler
                  </button>
                  <button type="submit" :disabled="addingTicket"
                    class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg v-if="addingTicket" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg> {{ addingTicket ? 'Ajout en cours…' : 'Ajouter le ticket' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div> <!-- Modal d'édition -->
        <div v-if="showEditModal"
          class="fixed inset-0 bg-gray-500/30 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
          @click.self="cancelEdit">
          <div class="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white m-4" @click.stop>
            <div class="mt-3">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Modifier le ticket</h3>
              <form class="space-y-4" @submit.prevent="updateTicket">
                <div>
                  <label for="editTicketName" class="block text-sm font-medium text-gray-700">Nom du ticket</label>
                  <input id="editTicketName" v-model="editingTicket.name" type="text" required
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
                <div>
                  <label for="editTicketDescription" class="block text-sm font-medium text-gray-700">Description</label>
                  <textarea id="editTicketDescription" v-model="editingTicket.description" rows="3" maxlength="240"
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  <p class="text-xs text-gray-500 mt-1">{{ (editingTicket.description || '').length }}/240 caractères
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="editTicketPrice" class="block text-sm font-medium text-gray-700">Prix (€)</label> <input
                      id="editTicketPrice" type="number" step="1" min="0" required
                      class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      :value="formatPrice(editingTicket.price)" @input="formatPriceInput('edit')">
                  </div>
                  <div>
                    <label for="editCurrency" class="block text-sm font-medium text-gray-700">Devise</label>
                    <select id="editCurrency" v-model="editingTicket.currency"
                      class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                      <option>EUR</option>
                      <option>USD</option>
                      <option>CHF</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label for="editMaxPerOrder" class="block text-sm font-medium text-gray-700">Quantité max par
                    commande</label>
                  <input id="editMaxPerOrder" v-model.number="editingTicket.max_per_order" type="number"
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
                <div>
                  <label for="editStock" class="block text-sm font-medium text-gray-700">Stock disponible</label>
                  <input id="editStock" v-model.number="editingTicket.stock" type="number"
                    placeholder="Illimité si vide"
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <p class="text-xs text-gray-500 mt-1">Laissez vide pour un stock illimité</p>
                </div>
                <div>
                  <label for="editActive" class="block text-sm font-medium text-gray-700">Statut</label>
                  <select id="editActive" v-model="editingTicket.active"
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option :value="true">Actif</option>
                    <option :value="false">Inactif</option>
                  </select>
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                  <button type="button"
                    class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    @click="cancelEdit">
                    Annuler
                  </button>
                  <button type="submit"
                    class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div> <!-- Modal de suppression -->
        <div v-if="showDeleteModal"
          class="fixed inset-0 bg-gray-500/30 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
          @click.self="cancelDelete">
          <div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white m-4" @click.stop>
            <div class="mt-3 text-center">
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 class="text-lg leading-6 font-medium text-gray-900 mt-2">Supprimer le ticket</h3>
              <div class="mt-2 px-7 py-3">
                <p class="text-sm text-gray-500">
                  Êtes-vous sûr de vouloir supprimer le ticket "<strong>{{ deletingTicket?.name }}</strong>" ?
                  Cette action ne peut pas être annulée.
                </p>
              </div>
              <div class="flex justify-center space-x-3 pt-4">
                <button type="button"
                  class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  @click="cancelDelete">
                  Annuler
                </button>
                <button type="button"
                  class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  @click="deleteTicket">
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="fixed top-4 right-4 z-50 space-y-4">
          <AdminNotification v-for="notification in notifications" :key="notification.id" :type="notification.type"
            :title="notification.title" :message="notification.message" @close="removeNotification(notification.id)" />
        </div> <!-- Modal de gestion des stocks -->
        <div v-if="showStockModal"
          class="fixed inset-0 bg-gray-500/30 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
          @click.self="cancelStock">
          <div class="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white m-4" @click.stop>
            <div class="mt-3">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Gestion du stock</h3>
              <form class="space-y-4" @submit.prevent="updateStock">
                <div>
                  <label for="stockTicketName" class="block text-sm font-medium text-gray-700">Nom du ticket</label>
                  <input id="stockTicketName" v-model="stockTicket.name" type="text" disabled
                    class="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
                <div>
                  <label for="newStock" class="block text-sm font-medium text-gray-700">Nouveau stock</label>
                  <input id="newStock" v-model.number="newStock" type="number" placeholder="0"
                    class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                  <button type="button"
                    class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    @click="cancelStock">
                    Annuler
                  </button>
                  <button type="submit"
                    class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div> <!-- Modal des filtres pour mobile -->
        <div v-if="showFilterSidebar"
          class="xl:hidden fixed inset-0 bg-gray-500/30 z-50 flex items-end justify-center sm:items-center"
          @click.self="showFilterSidebar = false">
          <div
            class="relative bg-white rounded-t-xl sm:rounded-xl w-full max-w-md mx-4 mb-0 sm:mb-4 max-h-[80vh] overflow-y-auto"
            @click.stop>
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-lg font-semibold text-gray-800">Filtres avancés</h2>
                <div class="flex items-center space-x-2">
                  <button class="text-sm text-blue-600 hover:text-blue-700 font-medium" @click="resetFilters">
                    Réinitialiser
                  </button>
                  <button class="text-gray-400 hover:text-gray-600" @click="showFilterSidebar = false">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="space-y-6">
                <!-- Filtre par statut -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <div class="space-y-2">
                    <label class="flex items-center">
                      <input v-model="filters.status" type="radio" value="all" class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Tous</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.status" type="radio" value="active"
                        class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Actifs</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.status" type="radio" value="inactive"
                        class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Inactifs</span>
                    </label>
                  </div>
                </div>

                <!-- Filtre par stock -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                  <div class="space-y-2">
                    <label class="flex items-center">
                      <input v-model="filters.stock" type="radio" value="all" class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Tous</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.stock" type="radio" value="unlimited"
                        class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Illimité</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.stock" type="radio" value="low" class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Stock faible (≤10)</span>
                    </label>
                    <label class="flex items-center">
                      <input v-model="filters.stock" type="radio" value="out" class="form-radio h-4 w-4 text-blue-600">
                      <span class="ml-2 text-sm text-gray-700">Épuisé</span>
                    </label>
                  </div>
                </div> <!-- Filtre par ventes -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Ventes</label>

                  <!-- Range slider toujours affiché dans mobile -->
                  <div class="mt-2 p-4 bg-gray-50 rounded-lg">
                    <label class="block text-xs font-medium text-gray-600 mb-2">
                      Nombre de ventes : {{ filters.salesRange[0] }} - {{ filters.salesRange[1] }}
                    </label>
                    <div class="flex items-center justify-between mb-2">
                      <input v-model.number="filters.salesRange[0]" type="number" min="0" :max="filters.salesRange[1]"
                        class="w-16 px-2 py-1 text-xs border rounded" @input="updateMinRange(filters.salesRange[0])">
                      <span class="text-xs text-gray-500">à</span>
                      <input v-model.number="filters.salesRange[1]" type="number" :min="filters.salesRange[0]"
                        :max="maxSalesRange" class="w-16 px-2 py-1 text-xs border rounded"
                        @input="updateMaxRange(filters.salesRange[1])">
                    </div>
                    <div class="relative h-6 flex items-center">
                      <!-- Track de fond -->
                      <div class="w-full h-2 bg-gray-200 rounded-lg" />
                      <!-- Range min -->
                      <input v-model.number="filters.salesRange[0]" type="range" min="0" :max="maxSalesRange"
                        class="absolute w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb"
                        @input="updateMinRange(filters.salesRange[0])">
                      <!-- Range max -->
                      <input v-model.number="filters.salesRange[1]" type="range" min="0" :max="maxSalesRange"
                        class="absolute w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb"
                        @input="updateMaxRange(filters.salesRange[1])">
                    </div>
                  </div>
                </div>

                <div class="pt-4">
                  <button
                    class="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    @click="showFilterSidebar = false">
                    Appliquer les filtres
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="alert alert-warning bg-yellow-100 text-yellow-800 p-4 rounded m-8">
        Cet événement n'utilise pas la billetterie Sway Tickets.
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Styles pour les range sliders à deux points */
.slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  pointer-events: none;
}

.slider-thumb::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  pointer-events: auto;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.slider-thumb::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  pointer-events: auto;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.slider-thumb::-webkit-slider-track {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}

.slider-thumb::-moz-range-track {
  background: transparent;
}

.slider-thumb:focus {
  outline: none;
}

.slider-thumb:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.slider-thumb:focus::-moz-range-thumb {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
</style>
