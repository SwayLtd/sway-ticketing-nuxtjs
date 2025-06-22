<template>
    <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Scan Statistics</h3>

        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <!-- Total -->
            <div class="text-center">
                <div class="text-2xl font-bold text-gray-900">
                    {{ stats.totalScanned }}
                </div>
                <div class="text-sm text-gray-500">Total</div>
            </div>

            <!-- Valid -->
            <div class="text-center">
                <div class="text-2xl font-bold text-green-600">
                    {{ stats.validScans }}
                </div>
                <div class="text-sm text-gray-500">Valid</div>
            </div>

            <!-- Invalid -->
            <div class="text-center">
                <div class="text-2xl font-bold text-red-600">
                    {{ stats.invalidScans }}
                </div>
                <div class="text-sm text-gray-500">Invalid</div>
            </div>

            <!-- Offline -->
            <div class="text-center">
                <div class="text-2xl font-bold text-orange-600">
                    {{ stats.offlineScans }}
                </div>
                <div class="text-sm text-gray-500">Offline</div>
            </div>
        </div>

        <!-- Progress bar -->
        <div class="mt-4">
            <div class="flex justify-between text-sm text-gray-600 mb-1">
                <span>Success rate</span>
                <span>{{ successRate }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div
class="bg-green-600 h-2 rounded-full transition-all duration-300"
                    :style="{ width: `${successRate}%` }"/>
            </div>
        </div>

        <!-- Quick indicators -->
        <div class="mt-4 flex items-center justify-between text-sm">
            <div class="flex items-center space-x-4">
                <div class="flex items-center">
                    <div class="w-2 h-2 bg-green-500 rounded-full mr-2"/>
                    <span class="text-gray-600">Accepted</span>
                </div>
                <div class="flex items-center">
                    <div class="w-2 h-2 bg-red-500 rounded-full mr-2"/>
                    <span class="text-gray-600">Rejected</span>
                </div>
                <div class="flex items-center">
                    <div class="w-2 h-2 bg-orange-500 rounded-full mr-2"/>
                    <span class="text-gray-600">Pending</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ScanStats {
    totalScanned: number
    validScans: number
    invalidScans: number
    offlineScans: number
}

interface Props {
    stats: ScanStats
}

const props = defineProps<Props>()

const successRate = computed(() => {
    if (props.stats.totalScanned === 0) return 0
    return Math.round((props.stats.validScans / props.stats.totalScanned) * 100)
})
</script>
