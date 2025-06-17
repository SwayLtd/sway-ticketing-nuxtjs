<template>
    <div class="scanner-interface min-h-screen bg-gray-100">
        <!-- Authentification -->
        <ScannerAuth v-if="!isAuthenticated" @authenticated="handleAuth" />

        <!-- Interface de scan -->
        <div v-else class="scanner-app">
            <!-- Header -->
            <ScannerHeader :event="currentEvent" :scanner="currentScanner" :stats="scannerStats" />

            <!-- Statut de connexion -->
            <ConnectionStatus :is-online="isOnline" :is-syncing="isSyncing" :offline-queue-count="offlineQueue.length"
                :last-sync-time="lastSyncTime" />

            <!-- Queue des scans offline -->
            <OfflineQueue v-if="offlineQueue.length > 0" :queue-items="offlineQueue" :can-sync="isOnline"
                :is-syncing="isSyncing" @sync-now="syncOfflineScans" @remove-item="removeFromOfflineQueue" />
            <!-- Scanner QR -->
            <div class="max-w-2xl mx-auto p-4">
                <QRScanner @qr-scanned="wrappedHandleQRScan" @clear-result="clearScanResult" :is-scanning="isScanning"
                    :scan-result="scanResult" :event-id="currentEvent?.id" :scanner-id="currentScanner?.id"
                    :is-online="isOnline" />

                <!-- Statistiques en temps réel -->
                <ScannerStats :stats="scannerStats" />
            </div>

            <!-- Plus de popup ScanResult -->
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useScanner } from '~/composables/useScanner'

// Import des composants
import ScannerAuth from '~/components/scanner/ScannerAuth.vue'
import ScannerHeader from '~/components/scanner/ScannerHeader.vue'
import ConnectionStatus from '~/components/scanner/ConnectionStatus.vue'
import OfflineQueue from '~/components/scanner/OfflineQueue.vue'
import QRScanner from '~/components/scanner/QRScanner.vue'
import ScannerStats from '~/components/scanner/ScannerStats.vue'
import ScanResult from '~/components/scanner/ScanResult.vue'

// Composable principal
const {
    isAuthenticated,
    currentEvent,
    currentScanner,
    isOnline,
    scannerStats,
    offlineQueue,
    isScanning,
    scanResult,
    isSyncing,
    lastSyncTime,
    handleAuth,
    handleQRScan,
    syncOfflineScans,
    clearScanResult,
    nextScan,
    removeFromOfflineQueue,
    downloadEventData
} = useScanner()

// Wrapper pour les logs
const wrappedHandleQRScan = (qrData) => {
    console.log('Page scanner: QR scanné:', qrData)
    handleQRScan(qrData)
}

// Gestion PWA et cache offline
onMounted(() => {
    // Enregistrer service worker si disponible
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker enregistré:', registration)
            })
            .catch(error => {
                console.error('Erreur Service Worker:', error)
            })
    }

    // Désactiver le zoom sur les appareils mobiles
    const viewport = document.querySelector('meta[name=viewport]')
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    }
})

onUnmounted(() => {
    // Nettoyage si nécessaire
})

// Définir le layout vide pour une expérience plein écran
definePageMeta({
    layout: false
})

// Meta pour PWA
useHead({
    title: 'Sway Scanner',
    meta: [
        { name: 'description', content: 'Scanner de tickets Sway' },
        { name: 'theme-color', content: '#1f2937' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
    ]
})
</script>

<style scoped>
.scanner-interface {
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
}

/* Empêcher le zoom sur les inputs sur iOS */
input[type="text"],
input[type="email"] {
    font-size: 16px;
}

/* Style pour les appareils mobiles */
@media (max-width: 768px) {
    .scanner-app {
        padding-bottom: 20px;
    }
}
</style>
