<template>
    <div class="fixed inset-0 bg-gray-500/30 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
        <div class="mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Ajouter un Scanner</h3>
                <form @submit.prevent="addScanner">
                    <div class="space-y-4">
                        <!-- Nom du scanner -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Nom du Scanner *
                            </label>
                            <input
v-model="form.name" type="text" required placeholder="Ex: Scanner Entrée Principale"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" >
                        </div>

                        <!-- Type de scanner -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Type de Scanner *
                            </label>
                            <select
v-model="form.type" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Sélectionner un type</option>
                                <option value="anonymous">Scanner Anonyme</option>
                                <option value="user">Utilisateur Existant</option>
                            </select>
                        </div>

                        <!-- Sélection utilisateur (si type = user) -->
                        <div v-if="form.type === 'user'">
                            <label class="block text-sm font-medium text-gray-700 mb-1">
                                Utilisateur *
                            </label>
                            <select
v-model="form.userId" required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Sélectionner un utilisateur</option>
                                <option v-for="user in users" :key="user.id" :value="user.id">
                                    {{ user.username }} ({{ user.email }})
                                </option>
                            </select>

                            <!-- Bouton pour chercher des utilisateurs -->
                            <button
type="button" class="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                @click="searchUsers">
                                Rechercher d'autres utilisateurs
                            </button>
                        </div>

                        <!-- Description du type sélectionné -->
                        <div v-if="form.type" class="bg-gray-50 p-3 rounded-md">
                            <p class="text-sm text-gray-600">
                                <span v-if="form.type === 'anonymous'">
                                    <strong>Scanner Anonyme :</strong> Un scanner indépendant avec un token unique.
                                    Idéal pour les appareils dédiés au contrôle d'accès.
                                </span>
                                <span v-else-if="form.type === 'user'">
                                    <strong>Scanner Utilisateur :</strong> Associé à un utilisateur existant de Sway.
                                    L'utilisateur peut se connecter directement avec ses identifiants.
                                </span>
                            </p>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex justify-end gap-3 mt-6">
                        <button
type="button" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            @click="$emit('close')">
                            Annuler
                        </button> <button
type="submit"
                            :disabled="loading || !form.name || !form.type || (form.type === 'user' && !form.userId)"
                            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {{ loading ? 'Création...' : 'Créer le Scanner' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

// Props et émissions
const props = defineProps({
    eventId: {
        type: [String, Number],
        required: true
    }
})

const emit = defineEmits(['close', 'scanner-added'])

// État reactif
const loading = ref(false)
const users = ref([])
const loadingUsers = ref(false)

const form = reactive({
    name: '',
    type: '',
    userId: null
})

// Méthodes
const fetchUsers = async () => {
    try {
        loadingUsers.value = true
        // TODO: Implémenter l'API pour récupérer les utilisateurs
        // const { data } = await $fetch('/api/admin/users')
        // users.value = data.users

        // Mock data pour le développement
        users.value = [
            { id: 1, username: 'admin', email: 'admin@sway.com' },
            { id: 2, username: 'scanner1', email: 'scanner1@sway.com' },
            { id: 3, username: 'manager', email: 'manager@sway.com' }
        ]
    } catch (error) {
        console.error('Erreur récupération utilisateurs:', error)
    } finally {
        loadingUsers.value = false
    }
}

const searchUsers = async () => {
    // TODO: Implémenter une recherche plus avancée d'utilisateurs
    console.log('Recherche d\'utilisateurs avancée')
}

const addScanner = async () => {
    console.log('addScanner appelé', { form: form, loading: loading.value })

    try {
        loading.value = true
        console.log('Démarrage création scanner...')

        const payload = {
            name: form.name,
            eventId: props.eventId,
            type: form.type,
            ...(form.type === 'user' && { userId: form.userId })
        }

        console.log('Création scanner avec payload:', payload)

        // Test avec fetch natif au lieu de $fetch
        const response = await fetch('/api/admin/scanners/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        console.log('Réponse HTTP status:', response.status)

        if (!response.ok) {
            const errorData = await response.text()
            console.error('Erreur HTTP:', response.status, errorData)
            throw new Error(`Erreur HTTP ${response.status}: ${errorData}`)
        } const data = await response.json()
        console.log('Réponse API:', data)

        if (data.success) {
            // Succès - émettre l'événement et fermer
            console.log('Émission de l\'événement scanner-added avec:', data.scanner)
            emit('scanner-added', data.scanner)
            console.log('Fermeture du modal')
            emit('close')

            // TODO: Afficher notification de succès
            console.log('Scanner créé avec succès:', data.scanner)
            console.log('URL Scanner:', data.scannerUrl)
        } else {
            console.error('Erreur: réponse API indique un échec')
        }
    } catch (error) {
        console.error('Erreur création scanner:', error)

        // Afficher l'erreur détaillée
        if (error.data) {
            console.error('Détails de l\'erreur:', error.data)
        }

        // TODO: Afficher notification d'erreur à l'utilisateur
        alert('Erreur lors de la création du scanner: ' + (error.data?.message || error.message || 'Erreur inconnue'))
    } finally {
        loading.value = false
    }
}

// Cycle de vie
onMounted(() => {
    console.log('ScannerAddModal monté avec eventId:', props.eventId)
    fetchUsers()
})
</script>

<style scoped>
/* Styles supplémentaires si nécessaire */
</style>
