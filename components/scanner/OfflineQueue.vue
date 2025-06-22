<template>
    <div v-if="queueItems.length > 0" class="bg-orange-50 border-l-4 border-orange-400 p-4">
        <div class="flex items-center justify-between">
            <div class="flex">
                <div class="flex-shrink-0">
                    <ExclamationTriangleIcon class="h-5 w-5 text-orange-400" />
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-medium text-orange-800">
                        Tickets en attente de synchronisation
                    </h3>
                    <div class="mt-2 text-sm text-orange-700">
                        <p>{{ queueItems.length }} ticket(s) scanné(s) hors ligne en attente de synchronisation.</p>
                    </div>
                </div>
            </div>
            <div class="flex space-x-2">
                <button
:disabled="!canSync || isSyncing" class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="$emit('sync-now')">
                    <ArrowPathIcon
:class="[
                        'w-3 h-3 mr-1',
                        isSyncing ? 'animate-spin' : ''
                    ]" />
                    {{ isSyncing ? 'Synchronisation...' : 'Synchroniser' }}
                </button>
                <button
class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200"
                    @click="showDetails = !showDetails">
                    {{ showDetails ? 'Masquer' : 'Détails' }}
                    <ChevronDownIcon
:class="[
                        'w-3 h-3 ml-1 transform transition-transform',
                        showDetails ? 'rotate-180' : ''
                    ]" />
                </button>
            </div>
        </div>

        <!-- Détails de la queue -->
        <div v-if="showDetails" class="mt-4">
            <div class="bg-white rounded-md shadow overflow-hidden">
                <ul class="divide-y divide-gray-200">
                    <li
v-for="(item, index) in queueItems" :key="index"
                        class="p-3 flex items-center justify-between text-sm">
                        <div>
                            <div class="font-medium text-gray-900">
                                Ticket: {{ item.ticketId?.substring(0, 8) }}...
                            </div>
                            <div class="text-gray-500">
                                {{ formatDate(item.scannedAt) }}
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span
:class="[
                                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                item.attempts > 0
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            ]">
                                {{ item.attempts > 0 ? `${item.attempts} tentative(s)` : 'En attente' }}
                            </span>
                            <button
class="text-red-600 hover:text-red-800" title="Supprimer de la queue"
                                @click="$emit('remove-item', index)">
                                <XMarkIcon class="w-4 h-4" />
                            </button>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    XMarkIcon
} from '@heroicons/vue/24/outline'

interface QueueItem {
    ticketId: string
    scannedAt: Date
    attempts: number
    lastError?: string
}

interface Props {
    queueItems: QueueItem[]
    canSync: boolean
    isSyncing: boolean
}

defineProps<Props>()
defineEmits<{
    'sync-now': []
    'remove-item': [index: number]
}>()

const showDetails = ref(false)

function formatDate(date: Date): string {
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}
</script>
