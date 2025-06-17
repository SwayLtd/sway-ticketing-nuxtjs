<template>
    <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">Test des imports d'icônes</h1>
        <div class="space-y-2">
            <div class="flex items-center space-x-2">
                <PlusIcon class="w-5 h-5" />
                <span>PlusIcon</span>
            </div>
            <div class="flex items-center space-x-2">
                <QrCodeIcon class="w-5 h-5" />
                <span>QrCodeIcon</span>
            </div>
            <div class="flex items-center space-x-2">
                <CheckIcon class="w-5 h-5" />
                <span>CheckIcon</span>
            </div>
            <div class="flex items-center space-x-2">
                <XMarkIcon class="w-5 h-5" />
                <span>XMarkIcon</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { PlusIcon, QrCodeIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'
</script>
