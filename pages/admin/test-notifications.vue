<!-- pages/admin/test-notifications.vue -->
<script setup>
import { ref } from 'vue'
import AdminNotification from '~/components/admin/AdminNotification.vue'

definePageMeta({
    layout: 'admin'
})

const notifications = ref([])

function showNotification(notification) {
    const id = Date.now() + Math.random()
    notifications.value.push({ ...notification, id })
}

function removeNotification(id) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
        notifications.value.splice(index, 1)
    }
}

// Test functions
function testSuccessNotification() {
    showNotification({
        type: 'success',
        title: 'Succès !',
        message: 'Cette action a été effectuée avec succès.'
    })
}

function testErrorNotification() {
    showNotification({
        type: 'error',
        title: 'Erreur',
        message: 'Une erreur est survenue lors de l\'exécution de cette action.'
    })
}

function testWarningNotification() {
    showNotification({
        type: 'warning',
        title: 'Attention',
        message: 'Cette action nécessite votre attention.'
    })
}

function testInfoNotification() {
    showNotification({
        type: 'info',
        title: 'Information',
        message: 'Voici une information importante à retenir.'
    })
}

function testOrderRefunded() {
    showNotification({
        type: 'success',
        title: 'Commande remboursée',
        message: 'La commande a été remboursée avec succès.'
    })
}

function testOrderCanceled() {
    showNotification({
        type: 'warning',
        title: 'Commande annulée',
        message: 'La commande a été annulée.'
    })
}

function testOrderFailed() {
    showNotification({
        type: 'error',
        title: 'Échec du remboursement',
        message: 'Le remboursement de la commande a échoué. Veuillez réessayer.'
    })
}

function clearAllNotifications() {
    notifications.value = []
}
</script>

<template>
    <div class="min-h-screen bg-gray-50">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Test des notifications</h1>
                <p class="mt-2 text-gray-600">Testez les différents types de notifications utilisées dans l'interface
                    d'administration.</p>
            </div>

            <!-- Notifications Container -->
            <AdminNotification
v-for="notification in notifications" :key="notification.id" :type="notification.type"
                :title="notification.title" :message="notification.message" class="mb-4"
                @close="removeNotification(notification.id)" />

            <!-- Test Controls -->
            <div class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                <div class="px-6 py-5 bg-gray-50">
                    <h2 class="text-xl font-semibold text-gray-900">Types de notifications</h2>
                    <p class="mt-1 text-sm text-gray-600">Cliquez sur les boutons ci-dessous pour tester chaque type de
                        notification.</p>
                </div>

                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <!-- Success -->
                        <button
class="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                            @click="testSuccessNotification">
                            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                            Succès
                        </button>

                        <!-- Error -->
                        <button
class="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            @click="testErrorNotification">
                            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Erreur
                        </button>

                        <!-- Warning -->
                        <button
class="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                            @click="testWarningNotification">
                            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Attention
                        </button>

                        <!-- Info -->
                        <button
class="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            @click="testInfoNotification">
                            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Information
                        </button>
                    </div>
                </div>
            </div>

            <!-- Order-specific Notifications -->
            <div class="mt-8 bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
                <div class="px-6 py-5 bg-gray-50">
                    <h2 class="text-xl font-semibold text-gray-900">Notifications de commandes</h2>
                    <p class="mt-1 text-sm text-gray-600">Testez les notifications spécifiques aux actions sur les
                        commandes.</p>
                </div>

                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Order Refunded -->
                        <button
class="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            @click="testOrderRefunded">
                            <svg
class="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Remboursement
                        </button>

                        <!-- Order Canceled -->
                        <button
class="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            @click="testOrderCanceled">
                            <svg
class="w-5 h-5 mr-2 text-yellow-600" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Annulation
                        </button>

                        <!-- Order Failed -->
                        <button
class="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            @click="testOrderFailed">
                            <svg
class="w-5 h-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Échec
                        </button>
                    </div>
                </div>
            </div>

            <!-- Clear All -->
            <div class="mt-8 flex justify-center">
                <button
v-if="notifications.length > 0" class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    @click="clearAllNotifications">
                    <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Effacer toutes les notifications
                </button>
            </div>
        </div>
    </div>
</template>
