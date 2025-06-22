<template>
    <div class="flex items-center justify-between p-2 bg-gray-50 border-b">
        <div class="flex items-center space-x-2">
            <!-- Indicateur de connexion -->
            <div class="flex items-center space-x-1">
                <div
:class="[
                    'w-2 h-2 rounded-full',
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                ]"/>
                <span class="text-xs font-medium text-gray-600">
                    {{ isOnline ? 'En ligne' : 'Hors ligne' }}
                </span>
            </div>

            <!-- Indicateur de synchronisation -->
            <div v-if="isSyncing" class="flex items-center space-x-1">
                <div class="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"/>
                <span class="text-xs text-blue-600">Synchronisation...</span>
            </div>
        </div>

        <!-- Queue hors ligne -->
        <div v-if="offlineQueueCount > 0" class="flex items-center space-x-1">
            <CloudArrowUpIcon class="w-4 h-4 text-orange-500" />
            <span class="text-xs text-orange-600">
                {{ offlineQueueCount }} en attente
            </span>
        </div>

        <!-- Dernière synchronisation -->
        <div v-if="lastSyncTime && isOnline" class="text-xs text-gray-500">
            Dernière sync: {{ formatLastSync(lastSyncTime) }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { CloudArrowUpIcon } from '@heroicons/vue/24/outline'

interface Props {
    isOnline: boolean
    isSyncing: boolean
    offlineQueueCount: number
    lastSyncTime?: Date | null
}

defineProps<Props>()

function formatLastSync(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)

    if (diffMinutes < 1) {
        return 'À l\'instant'
    } else if (diffMinutes < 60) {
        return `Il y a ${diffMinutes}min`
    } else if (diffHours < 24) {
        return `Il y a ${diffHours}h`
    } else {
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }
}
</script>
