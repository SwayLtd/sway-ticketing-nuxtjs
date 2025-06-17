<template>
    <div v-if="result" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <!-- Résultat valide -->
            <div v-if="result.valid" class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <CheckIcon class="h-6 w-6 text-green-600" />
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Ticket Valide</h3>
                <div class="text-sm text-gray-600 space-y-1">
                    <p><strong>ID:</strong> {{ result.ticket.id }}</p>
                    <p><strong>Commande:</strong> {{ result.ticket.order_id }}</p>
                    <p v-if="result.ticket.customization_data">
                        <strong>Nom:</strong> {{ getCustomName(result.ticket.customization_data) }}
                    </p>
                </div>
            </div>

            <!-- Résultat invalide -->
            <div v-else class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <XMarkIcon class="h-6 w-6 text-red-600" />
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Ticket Invalide</h3>
                <div class="text-sm text-gray-600">
                    <p v-if="result.reason === 'ticket_not_found'">
                        Ticket non trouvé pour cet événement
                    </p>
                    <p v-else-if="result.reason === 'already_scanned'">
                        Ticket déjà scanné le {{ formatDate(result.scanned_at) }}
                    </p>
                    <p v-else-if="result.reason === 'invalid_status'">
                        Statut du ticket invalide: {{ result.status }}
                    </p>
                    <p v-else>
                        {{ result.reason }}
                    </p>
                </div>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex justify-center space-x-3">
                <button @click="$emit('close')"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    Fermer
                </button>
                <button v-if="result.valid" @click="$emit('next-scan')"
                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
                    Scanner suivant
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'

interface ScanResultData {
    valid: boolean
    reason?: string
    ticket?: {
        id: string
        order_id: string
        product_id: string
        event_id: number
        customization_data?: any
    }
    scanned_at?: string
    scanned_by?: string
    status?: string
}

interface Props {
    result: ScanResultData | null
}

defineProps<Props>()
defineEmits<{
    close: []
    'next-scan': []
}>()

function getCustomName(customizationData: any): string {
    if (!customizationData) return 'N/A'

    try {
        const data = typeof customizationData === 'string'
            ? JSON.parse(customizationData)
            : customizationData

        return data.firstName && data.lastName
            ? `${data.firstName} ${data.lastName}`
            : data.firstName || data.lastName || 'N/A'
    } catch {
        return 'N/A'
    }
}

function formatDate(dateString: string): string {
    if (!dateString) return 'N/A'

    try {
        return new Date(dateString).toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    } catch {
        return dateString
    }
}
</script>
