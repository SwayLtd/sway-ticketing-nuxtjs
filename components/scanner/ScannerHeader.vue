<template>
    <div class="scanner-header bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center py-4">
                <!-- Informations événement -->
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <h1 class="text-lg font-semibold text-gray-900">{{ event?.title }}</h1>
                        <p class="text-sm text-gray-500">
                            Scanner: {{ scanner?.name }}
                            <span v-if="scanner?.users"> - {{ scanner.users.username }}</span>
                        </p>
                    </div>
                </div>

                <!-- Statistiques rapides -->
                <div class="flex items-center space-x-4">
                    <div class="text-center">
                        <div class="text-lg font-semibold text-green-600">{{ stats.validScans }}</div>
                        <div class="text-xs text-gray-500">Validés</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-semibold text-red-600">{{ stats.invalidScans }}</div>
                        <div class="text-xs text-gray-500">Refusés</div>
                    </div>
                    <div class="text-center">
                        <div class="text-lg font-semibold text-gray-600">{{ stats.totalScanned }}</div>
                        <div class="text-xs text-gray-500">Total</div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center space-x-2">
                    <button class="p-2 text-gray-400 hover:text-gray-600 rounded-md" @click="showStats = !showStats">
                        <ChartBarIcon class="h-5 w-5" />
                    </button>
                    <button
class="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                        @click="showSettings = !showSettings">
                        <CogIcon class="h-5 w-5" />
                    </button>
                </div>
            </div>

            <!-- Statistiques détaillées (collapsible) -->
            <div v-if="showStats" class="border-t border-gray-200 pt-4 pb-4">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-sm font-medium text-gray-900">Session démarrée</div>
                        <div class="text-sm text-gray-600">{{ formatTime(stats.sessionStart) }}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-sm font-medium text-gray-900">Durée</div>
                        <div class="text-sm text-gray-600">{{ sessionDuration }}</div>
                    </div>
                    <div class="bg-yellow-50 rounded-lg p-3">
                        <div class="text-sm font-medium text-yellow-800">Scans offline</div>
                        <div class="text-sm text-yellow-600">{{ stats.offlineScans }}</div>
                    </div>
                    <div class="bg-blue-50 rounded-lg p-3">
                        <div class="text-sm font-medium text-blue-800">Taux de succès</div>
                        <div class="text-sm text-blue-600">{{ successRate }}%</div>
                    </div>
                </div>
            </div>            <!-- Paramètres (collapsible) -->
            <div v-if="showSettings" class="border-t border-gray-200 pt-4 pb-4">
                <div class="flex items-center justify-end">
                    <button class="text-sm text-red-600 hover:text-red-800 font-medium" @click="logout">
                        Déconnexion
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChartBarIcon, CogIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
    event: Object,
    scanner: Object,
    stats: {
        type: Object,
        default: () => ({
            totalScanned: 0,
            validScans: 0,
            invalidScans: 0,
            offlineScans: 0,
            sessionStart: new Date()
        })
    }
})

// État local
const showStats = ref(false)
const showSettings = ref(false)
const currentTime = ref(new Date())

// Computed
const sessionDuration = computed(() => {
    const diff = currentTime.value - new Date(props.stats.sessionStart)
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const successRate = computed(() => {
    if (props.stats.totalScanned === 0) return 0
    return Math.round((props.stats.validScans / props.stats.totalScanned) * 100)
})

// Méthodes
const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    })
}

const logout = () => {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        // Recharger la page pour revenir à l'auth
        window.location.reload()
    }
}

// Timer pour mettre à jour la durée
let timer = null

onMounted(() => {
    timer = setInterval(() => {
        currentTime.value = new Date()
    }, 1000)
})

onUnmounted(() => {
    if (timer) {
        clearInterval(timer)
    }
})
</script>

<style scoped>
/* Styles pour mobile */
@media (max-width: 640px) {
    .scanner-header {
        position: sticky;
        top: 0;
        z-index: 10;
    }

    .flex.justify-between {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .flex.items-center.space-x-4 {
        align-self: stretch;
        justify-content: space-between;
    }
}
</style>
