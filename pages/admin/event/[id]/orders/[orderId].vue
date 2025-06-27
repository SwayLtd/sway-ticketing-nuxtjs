<!-- pages/admin/event/[id]/orders/[orderId].vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useEntityPermission } from '~/composables/useEntityPermission'

// Import print styles
import '~/assets/css/print-orders.css'

// Import components
import OrderActionPanel from '~/components/admin/orders/OrderActionPanel.vue'
import AdminNotification from '~/components/admin/AdminNotification.vue'

definePageMeta({
    layout: 'admin-event'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const router = useRouter()

// Get IDs from URL
const eventId = route.params.id
const orderId = route.params.orderId

const orderDetails = ref(null)
const orderProducts = ref([])
const loading = ref(true)
const error = ref(null)
const notAuthorized = ref(false)
const copiedValue = ref(null)
const notifications = ref([])

// Pour obtenir l'ID interne de l'utilisateur (integer) depuis la table "users"
const userIdInt = ref(null)

const { currentUserPermission, fetchPermission } = useEntityPermission(eventId, 'event')

async function fetchOrderDetails() {
    loading.value = true
    error.value = null

    try {
        // Vérifier l'autorisation de l'utilisateur
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('supabase_id', user.value.id)
            .single()

        if (userError || !userData) {
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

        if (permError || !permData || permData.length === 0) {
            notAuthorized.value = true
            loading.value = false
            return
        }

        // Récupérer les détails de la commande
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('entity_type', 'event')
            .eq('entity_id', eventId)
            .single()

        if (orderError || !orderData) {
            error.value = 'Commande non trouvée ou vous n\'avez pas accès à cette commande.'
            loading.value = false
            return
        }

        orderDetails.value = orderData

        // Récupérer les produits de la commande avec les détails des produits
        const { data: productsData, error: productsError } = await supabase
            .from('order_products')
            .select(`
        *,
        products (
          id,
          name,
          description,
          type,
          currency
        )
      `)
            .eq('order_id', orderId)

        if (productsError) {
            console.error('Erreur lors de la récupération des produits:', productsError)
            error.value = 'Erreur lors de la récupération des produits de la commande.'
        } else {
            orderProducts.value = productsData || []
        }

    } catch (err) {
        console.error('Erreur lors de la récupération des détails de la commande:', err)
        error.value = 'Une erreur inattendue s\'est produite.'
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    await fetchPermission()
    await fetchOrderDetails()
})

function goBack() {
    router.push(`/admin/event/${eventId}/orders`)
}

function copyToClipboard(text, value) {
    navigator.clipboard.writeText(text).then(() => {
        copiedValue.value = value
        setTimeout(() => {
            copiedValue.value = null
        }, 2000)
    }).catch(err => {
        console.error('Impossible de copier le texte: ', err)
    })
}

function formatCurrency(amount, currency) {
    if (!amount || !currency) {
        return '-'
    }
    // Handle both string and number inputs
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numericAmount)) {
        return '-'
    }
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency.toUpperCase()
    }).format(numericAmount)
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

const totalCalculated = computed(() => {
    if (!orderProducts.value.length) return 0
    return orderProducts.value.reduce((sum, item) => {
        const price = typeof item.price === 'string' ? parseFloat(item.price) : (typeof item.price === 'number' ? item.price : 0)
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0
        return sum + (price * quantity)
    }, 0)
})

// Notification management
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

// Order update handler
function handleOrderUpdate(updatedOrder) {
    orderDetails.value = updatedOrder
    // Refresh the page data if needed
    fetchOrderDetails()
}
</script>

<template>
    <div class="min-h-screen bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"> <!-- Print Header (hidden on screen) -->
            <div class="print-header" style="display: none;">
                <h1>Détails de la commande</h1>
                <p>{{ orderDetails?.id }}</p>
            </div>

            <!-- Header -->
            <div class="flex items-center justify-between mb-8 print-hidden">
                <div>
                    <button
class="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors duration-200"
                        @click="goBack">
                        <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Retour aux commandes
                    </button>
                    <h1 class="text-3xl font-bold text-gray-900 mb-1">Détails de la commande</h1>
                    <p class="text-sm text-gray-600">Informations détaillées sur la commande sélectionnée.</p>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-24">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"/>
                <p class="ml-4 text-lg text-gray-600">Chargement des détails de la commande...</p>
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
                        <p class="text-red-700 mt-1">Vous n'avez pas les permissions nécessaires pour consulter cette
                            commande.</p>
                    </div>
                </div>
            </div>

            <!-- Error Message -->
            <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg shadow-md">
                <div class="flex items-center">
                    <svg class="h-8 w-8 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 class="text-lg font-semibold text-red-800">Une erreur est survenue</h3>
                        <p class="text-red-700 mt-1">{{ error }}</p>
                    </div>
                </div>
            </div> <!-- Order Details -->
            <div v-else-if="orderDetails" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Main Content -->
                <div class="lg:col-span-2 space-y-8">
                    <!-- Order ID and Status -->
                    <div class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                        <div class="px-6 py-5 bg-gray-50">
                            <h2 class="text-xl font-semibold text-gray-900">Informations générales</h2>
                        </div>
                        <div class="p-6 space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-500 mb-1">ID de la
                                        commande</label>
                                    <div class="relative group flex items-center">
                                        <span class="text-lg font-mono text-gray-900" :title="orderDetails.id">{{
                                            orderDetails.id }}</span>
                                        <button
class="ml-2 p-1 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            :aria-label="`Copier l'ID ${orderDetails.id}`"
                                            @click="copyToClipboard(orderDetails.id, orderDetails.id)">
                                            <span
v-if="copiedValue === orderDetails.id"
                                                class="text-green-600 text-xs font-semibold">Copié!</span>
                                            <svg
v-else class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24"
                                                stroke="currentColor" title="Copier l'ID complet">
                                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-500 mb-1">Statut</label>
                                    <span
:class="{
                                        'px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full': true,
                                        'bg-green-100 text-green-800': ['succeeded', 'paid'].includes(orderDetails.status),
                                        'bg-yellow-100 text-yellow-800': ['pending'].includes(orderDetails.status),
                                        'bg-red-100 text-red-800': ['failed', 'canceled'].includes(orderDetails.status),
                                        'bg-gray-100 text-gray-800': !['succeeded', 'paid', 'pending', 'failed', 'canceled'].includes(orderDetails.status)
                                    }">
                                        {{ orderDetails.status }}
                                    </span>
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div v-if="orderDetails.buyer_email">
                                    <label class="block text-sm font-medium text-gray-500 mb-1">Email de
                                        l'acheteur</label>
                                    <div class="relative group flex items-center">
                                        <span class="text-base text-gray-900">{{ orderDetails.buyer_email }}</span>
                                        <button
                                            class="ml-2 p-1 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            :aria-label="`Copier l'email ${orderDetails.buyer_email}`"
                                            @click="copyToClipboard(orderDetails.buyer_email, orderDetails.buyer_email)">
                                            <span
v-if="copiedValue === orderDetails.buyer_email"
                                                class="text-green-600 text-xs font-semibold">Copié!</span>
                                            <svg
v-else class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24"
                                                stroke="currentColor" title="Copier l'email">
                                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-500 mb-1">Date de création</label>
                                    <p class="text-base text-gray-800 font-medium">{{
                                        formatDate(orderDetails.created_at) }}</p>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-500 mb-1">Montant total</label>
                                    <p class="text-lg font-bold text-gray-900">{{
                                        formatCurrency(orderDetails.total_amount, orderDetails.currency) }}</p>
                                    <p class="text-sm text-gray-500 mt-1">Total calculé: {{
                                        formatCurrency(totalCalculated, orderDetails.currency) }}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-500 mb-1">Devise</label>
                                    <p class="text-base text-gray-800">{{ orderDetails.currency?.toUpperCase() || 'EUR'
                                        }}</p>
                                </div>
                            </div>
                            <div
v-if="orderDetails.payment_provider"
                                class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-500 mb-1">Fournisseur de
                                        paiement</label>
                                    <div class="flex items-center space-x-2">
                                        <!-- Provider logo/icon -->
                                        <div
v-if="orderDetails.payment_provider.toLowerCase().includes('stripe')"
                                            class="flex items-center">
                                            <div
                                                class="w-6 h-6 bg-blue-600 rounded flex items-center justify-center mr-2">
                                                <span class="text-white text-xs font-bold">S</span>
                                            </div>
                                            <span class="text-base text-gray-800">Stripe</span>
                                        </div>
                                        <div
v-else-if="orderDetails.payment_provider.toLowerCase().includes('paypal')"
                                            class="flex items-center">
                                            <div
                                                class="w-6 h-6 bg-blue-500 rounded flex items-center justify-center mr-2">
                                                <span class="text-white text-xs font-bold">P</span>
                                            </div>
                                            <span class="text-base text-gray-800">PayPal</span>
                                        </div>
                                        <div v-else class="flex items-center">
                                            <div
                                                class="w-6 h-6 bg-gray-500 rounded flex items-center justify-center mr-2">
                                                <span class="text-white text-xs font-bold">{{
                                                    orderDetails.payment_provider.charAt(0).toUpperCase() }}</span>
                                            </div>
                                            <span class="text-base text-gray-800">{{ orderDetails.payment_provider
                                                }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
v-if="orderDetails.refunded_at"
                                class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div class="flex items-center">
                                    <svg
class="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24"
                                        stroke="currentColor">
                                        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833-.23 2.5 1.732 2.5z" />
                                    </svg>
                                    <span class="text-sm font-medium text-yellow-800">
                                        Commande remboursée le {{ formatDate(orderDetails.refunded_at) }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Products Table -->
                    <div
v-if="orderProducts.length"
                        class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                        <div class="px-6 py-5 bg-gray-50">
                            <h2 class="text-xl font-semibold text-gray-900">Produits commandés</h2>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th
scope="col"
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Produit</th>
                                        <th
scope="col"
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type</th>
                                        <th
scope="col"
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Quantité</th>
                                        <th
scope="col"
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Prix unitaire</th>
                                        <th
scope="col"
                                            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    <tr v-for="item in orderProducts" :key="item.id">
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div class="text-sm font-medium text-gray-900">
                                                    {{ item.products?.name || 'Produit inconnu' }}
                                                </div>
                                                <div v-if="item.products?.description" class="text-sm text-gray-500">
                                                    {{ item.products.description }}
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {{ item.products?.type || '-' }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {{ item.quantity }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {{ formatCurrency(item.price, item.products?.currency ||
                                                orderDetails.currency) }}
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {{ formatCurrency(item.price * item.quantity, item.products?.currency ||
                                                orderDetails.currency) }}
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot class="bg-gray-50">
                                    <tr>
                                        <td colspan="4" class="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                                            Total calculé:
                                        </td>
                                        <td class="px-6 py-4 text-sm font-bold text-gray-900">
                                            {{ formatCurrency(totalCalculated, orderDetails.currency) }}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <!-- No Products -->
                    <div v-else class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                        <div class="px-6 py-5 bg-gray-50">
                            <h2 class="text-xl font-semibold text-gray-900">Produits commandés</h2>
                        </div>
                        <div class="text-center py-12">
                            <svg
class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <h3 class="mt-2 text-sm font-medium text-gray-900">Aucun produit</h3>
                            <p class="mt-1 text-sm text-gray-500">Aucun produit n'a été trouvé pour cette commande.</p>
                        </div>
                    </div>
                </div>

                <!-- Sidebar -->
                <div class="space-y-8">
                    <!-- Export/Print Actions -->
                    <div class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden print-hidden">
                        <div class="px-6 py-5 bg-gray-50">
                            <h3 class="text-lg font-semibold text-gray-900">Actions</h3>
                        </div>
                        <div class="p-6 space-y-3">
                            <button
class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                @click="window.print()">
                                <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                Imprimer
                            </button>
                            <a
:href="`/api/admin/orders/${orderId}/export-pdf?eventId=${eventId}`" target="_blank"
                                class="w-full flex items-center justify-center px-4 py-2 border border-blue-300 rounded-md shadow-sm bg-white text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Exporter PDF
                            </a>
                        </div>
                    </div> <!-- Action Panel -->
                    <OrderActionPanel
:order="orderDetails"
                        :event-id="eventId"
                        :user-permission="currentUserPermission"
                        @order-updated="handleOrderUpdate"
                        @show-notification="showNotification" />
                </div>
            </div> <!-- Notifications -->
            <div class="fixed top-4 right-4 z-50 space-y-2">
                <AdminNotification
v-for="notification in notifications" :key="notification.id"
                    :type="notification.type" :message="notification.message"
                    @close="removeNotification(notification.id)" />
            </div>
        </div>
    </div>
</template>
