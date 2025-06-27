<template>
    <div class="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div class="max-w-7xl mx-auto">
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-2">
                    Gestion des scanners
                </h1>
                <p class="text-lg text-gray-600">
                    Gérez les scanners pour l'événement
                </p>
            </div>

            <!-- Statistiques -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 class="text-sm font-medium text-gray-500">Total Scanners</h3>
                    <p class="text-3xl font-semibold text-gray-900 mt-1">{{ scanners.length }}</p>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 class="text-sm font-medium text-gray-500">Actifs</h3>
                    <p class="text-3xl font-semibold text-green-600 mt-1">
                        {{scanners.filter(s => s.status === 'active').length}}
                    </p>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 class="text-sm font-medium text-gray-500">Utilisateurs</h3>
                    <p class="text-3xl font-semibold text-blue-600 mt-1">
                        {{scanners.filter(s => s.user_id).length}}
                    </p>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <h3 class="text-sm font-medium text-gray-500">Anonymes</h3>
                    <p class="text-3xl font-semibold text-purple-600 mt-1">
                        {{scanners.filter(s => !s.user_id).length}}
                    </p>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-800">Liste des Scanners</h2>
                <button
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                    :disabled="currentUserPermission < 2"
                    :class="currentUserPermission < 2 ? 'opacity-50 cursor-not-allowed' : ''"
                    @click="currentUserPermission >= 2 && (showAddModal = true)">
                    <PlusIcon class="h-5 w-5" />
                    Ajouter un scanner
                </button>
            </div>

            <!-- Grille des scanners -->
            <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Squelette de chargement -->
                <div v-for="i in 3" :key="i" class="bg-white rounded-lg shadow-md animate-pulse">
                    <div class="p-5">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center">
                                <div class="h-12 w-12 rounded-full bg-gray-200" />
                                <div class="ml-4">
                                    <div class="h-4 w-32 bg-gray-200 rounded" />
                                    <div class="h-3 w-48 bg-gray-200 rounded mt-2" />
                                </div>
                            </div>
                            <div class="h-6 w-16 bg-gray-200 rounded-full" />
                        </div>
                    </div>
                    <div class="bg-gray-50 px-5 py-3 mt-4">
                        <div class="h-4 w-24 bg-gray-200 rounded ml-auto" />
                    </div>
                </div>
            </div>

            <div v-else-if="scanners.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="scanner in scanners" :key="scanner.id"
                    class="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between transition-transform duration-300 hover:shadow-lg hover:-translate-y-1">
                    <div class="p-5">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center"
                                    :class="scanner.status === 'active' ? 'bg-green-100' : 'bg-gray-100'">
                                    <QrCodeIcon class="h-7 w-7"
                                        :class="scanner.status === 'active' ? 'text-green-600' : 'text-gray-400'" />
                                </div>
                                <div class="ml-4">
                                    <p class="text-lg font-bold text-gray-900">{{ scanner.name }}</p>
                                    <span v-if="scanner.status === 'active'"
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Actif
                                    </span>
                                    <span v-else
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        Inactif
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <p class="text-sm text-gray-600">
                                <span class="font-semibold">Type:</span>
                                <span v-if="scanner.users" class="ml-1">
                                    Utilisateur : {{ scanner.users.username }}
                                </span>
                                <span v-else class="ml-1">
                                    Anonyme
                                </span>
                            </p>
                            <p v-if="scanner.users" class="text-sm text-gray-500">
                                <span class="font-semibold">Email:</span> {{ scanner.users.email }}
                            </p>
                            <p class="text-xs text-gray-400 pt-2">
                                Créé le {{ formatDate(scanner.created_at) }}
                            </p>
                        </div>
                    </div>
                    <div class="bg-gray-50 px-5 py-3 rounded-b-xl">
                        <div class="flex items-center justify-end gap-3">
                            <button title="Générer l'URL de scan" :disabled="false" :class="''"
                                class="text-gray-500 hover:text-blue-600 transition-colors"
                                @click="generateScannerUrl(scanner)">
                                <LinkIcon class="h-5 w-5" />
                            </button>
                            <button :title="scanner.status === 'active' ? 'Désactiver' : 'Activer'"
                                class="transition-colors"
                                :class="currentUserPermission < 2 ? 'opacity-50 cursor-not-allowed text-gray-400 hover:text-gray-400' : 'hover:text-green-600 text-gray-500'"
                                :disabled="currentUserPermission < 2" :aria-disabled="currentUserPermission < 2"
                                @click="currentUserPermission >= 2 && toggleScannerStatus(scanner)">
                                <PowerIcon class="h-5 w-5" />
                            </button>
                            <button title="Supprimer le scanner" class="transition-colors"
                                :class="currentUserPermission < 2 ? 'opacity-50 cursor-not-allowed text-gray-400 hover:text-gray-400' : 'hover:text-red-600 text-gray-500'"
                                :disabled="currentUserPermission < 2" :aria-disabled="currentUserPermission < 2"
                                @click="currentUserPermission >= 2 && deleteScanner(scanner.id)">
                                <TrashIcon class="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
                <QrCodeIcon class="mx-auto h-12 w-12 text-gray-400" />
                <h3 class="mt-2 text-lg font-medium text-gray-900">Aucun scanner trouvé</h3>
                <p class="mt-1 text-sm text-gray-500">Commencez par ajouter un nouveau scanner pour cet événement.</p>
            </div>
        </div>

        <!-- Modal d'ajout -->
        <ScannerAddModal v-if="showAddModal" :event-id="eventId" @close="showAddModal = false"
            @scanner-added="refreshScanners" />

        <!-- Modal URL -->
        <div v-if="showUrlModal"
            class="fixed inset-0 bg-gray-500/30 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div class="relative mx-auto p-6 border w-full max-w-md shadow-xl rounded-2xl bg-white">
                <div class="mt-3 text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                        <LinkIcon class="h-6 w-6 text-blue-600" aria-hidden="true" />
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 my-3">URL de Scanner</h3>
                    <div class="mb-4 text-left">
                        <label class="block text-sm font-medium text-gray-700 mb-2">URL d'accès unique :</label>
                        <div class="flex rounded-md shadow-sm mb-4">
                            <input v-model="generatedUrl" readonly
                                class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm bg-gray-50">
                            <button
                                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                @click="copyToClipboard">
                                Copier
                            </button>
                        </div>
                        <div class="flex justify-center my-4">
                            <QrCode :value="generatedUrl" :size="160" />
                        </div>
                        <p v-if="copySuccess" class="text-green-600 text-sm mt-2">Copié dans le presse-papiers !</p>
                    </div>
                    <div class="mt-4">
                        <button
                            class="w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800"
                            @click="showUrlModal = false">
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { PlusIcon, QrCodeIcon, LinkIcon, PowerIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useEntityPermission } from '~/composables/useEntityPermission'

// Props et router
const route = useRoute()
const eventId = route.params.id
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Permissions centralisées
const { currentUserPermission, fetchPermission } = useEntityPermission(eventId, 'event')

onMounted(async () => {
    await fetchPermission()
    fetchScanners()
    fetchEventDetails()
})

// État reactif
const scanners = ref([])
const event = ref(null)
const showAddModal = ref(false)
const showUrlModal = ref(false)
const generatedUrl = ref('')
const loading = ref(true) // Démarrer en mode chargement
const copySuccess = ref(false)


// Méthodes
const fetchScanners = async () => {
    try {
        loading.value = true
        const response = await $fetch(`/api/admin/scanners/${eventId}`)
        console.log('Response fetchScanners:', response)

        if (response.success) {
            scanners.value = response.scanners
            console.log('Scanners chargés:', scanners.value.length)
        } else {
            console.error('Erreur dans la réponse:', response)
        }
    } catch (error) {
        console.error('Erreur récupération scanners:', error)
        // TODO: Afficher notification d'erreur
    } finally {
        loading.value = false
    }
}

const fetchEventDetails = async () => {
    try {
        // TODO: Récupérer les détails de l'événement
        // const { data } = await $fetch(`/api/events/${eventId}`)
        // event.value = data
    } catch (error) {
        console.error('Erreur récupération événement:', error)
    }
}

const refreshScanners = () => {
    console.log('refreshScanners appelé - rechargement des scanners...')
    fetchScanners()
}

const generateScannerUrl = (scanner) => {
    const baseUrl = window.location.origin
    generatedUrl.value = `${baseUrl}/scanner?event_id=${eventId}&auth_token=${scanner.auth_token}`
    copySuccess.value = false
    showUrlModal.value = true
}

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(generatedUrl.value)
        copySuccess.value = true
        setTimeout(() => {
            copySuccess.value = false
        }, 2000);
        console.log('URL copiée dans le presse-papiers')
    } catch (error) {
        console.error('Erreur copie:', error)
    }
}

const toggleScannerStatus = async (scanner) => {
    try {
        const newStatus = scanner.status === 'active' ? 'inactive' : 'active'
        // TODO: Implémenter l'API de mise à jour du statut
        // Pour l'instant, mise à jour optimiste de l'UI
        const response = await $fetch(`/api/admin/scanners/status`, {
            method: 'PUT',
            body: { scannerId: scanner.id, status: newStatus }
        })

        if (response.success) {
            scanner.status = newStatus
            console.log(`Scanner ${scanner.name} ${newStatus}`)
            // TODO: Afficher une notification de succès
        } else {
            // TODO: Afficher une notification d'erreur
            console.error('Erreur lors de la mise à jour du statut')
        }
    } catch (error) {
        console.error('Erreur changement statut:', error)
    }
}

const deleteScanner = async (scannerId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce scanner ? Cette action est irréversible.')) {
        return
    }

    try {
        // TODO: Implémenter l'API de suppression
        const response = await $fetch(`/api/admin/scanners/delete`, {
            method: 'DELETE',
            body: { scannerId }
        })

        if (response.success) {
            scanners.value = scanners.value.filter(s => s.id !== scannerId)
            console.log('Scanner supprimé')
            // TODO: Afficher une notification de succès
        } else {
            // TODO: Afficher une notification d'erreur
            console.error('Erreur lors de la suppression')
        }
    } catch (error) {
        console.error('Erreur suppression:', error)
    }
}

const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue'
    return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Cycle de vie
onMounted(() => {
    fetchPermission()
    fetchScanners()
    fetchEventDetails()
})

// Définir le layout
definePageMeta({
    layout: 'admin-event'
})
</script>

<style scoped>
/* On peut garder le scoped vide si tout est géré par Tailwind, ou ajouter des styles custom ici */
</style>
