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
                :last-sync-time="lastSyncTime" />            <!-- Queue des scans offline -->
            <OfflineQueue v-if="offlineQueue.length > 0" :queue-items="offlineQueue" :can-sync="isOnline"
                :is-syncing="isSyncing" @sync-now="syncOfflineScans" @remove-item="removeFromOfflineQueue" />
            
            <!-- Scanner QR -->
            <div class="max-w-2xl mx-auto p-4">
                <QRScanner @qr-scanned="wrappedHandleQRScan" @clear-result="clearScanResult" :is-scanning="isScanning"
                    :scan-result="scanResult" :event-id="currentEvent?.id" :scanner-id="currentScanner?.id"
                    :is-online="isOnline" />                <!-- Statistiques en temps réel -->
                <ScannerStats :stats="scannerStats" />
                
                <!-- Préférences utilisateur -->
                <div class="mt-6">
                    <ScannerPreferences :vibration-enabled="vibrationEnabled" @toggle-vibration="toggleVibration" />
                </div>
            </div>

            <!-- Plus de popup ScanResult -->
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useScanner } from '~/composables/useScanner'
import { useScannerSound } from '~/composables/useScannerSound'

// Import des composants
import ScannerAuth from '~/components/scanner/ScannerAuth.vue'
import ScannerHeader from '~/components/scanner/ScannerHeader.vue'
import ConnectionStatus from '~/components/scanner/ConnectionStatus.vue'
import OfflineQueue from '~/components/scanner/OfflineQueue.vue'
import QRScanner from '~/components/scanner/QRScanner.vue'
import ScannerStats from '~/components/scanner/ScannerStats.vue'
import ScannerPreferences from '~/components/scanner/ScannerPreferences.vue'
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

// Composable pour le feedback sonore
const {
    soundEnabled,
    initAudioContext,
    loadSoundPreferences,
    playScanSound
} = useScannerSound()

// Préférences utilisateur
const vibrationEnabled = ref(true)

// Charger les préférences depuis localStorage
onMounted(() => {
    if (process.client) {
        const savedVibration = localStorage.getItem('scanner-vibration-enabled')
        if (savedVibration !== null) {
            vibrationEnabled.value = JSON.parse(savedVibration)
        }
        
        // Initialiser le contexte audio et charger les préférences sonores
        initAudioContext()
        loadSoundPreferences()
    }
})

// Sauvegarder les préférences
const toggleVibration = () => {
    vibrationEnabled.value = !vibrationEnabled.value
    if (process.client) {
        localStorage.setItem('scanner-vibration-enabled', JSON.stringify(vibrationEnabled.value))
    }
}

// Wrapper pour les logs, vibrations et sons
const wrappedHandleQRScan = (qrData) => {
    console.log('Page scanner: QR scanné:', qrData)
    
    // Déclencher feedback pour la détection du QR
    triggerScanVibration('detection')
    playScanSound('detection')
    
    handleQRScan(qrData)
}

// Fonction pour gérer les vibrations selon le contexte
const triggerScanVibration = (type) => {
    if (!process.client || !('vibrate' in navigator) || !vibrationEnabled.value) return
    
    try {
        switch (type) {
            case 'detection':
                // Vibration courte pour la détection du QR
                navigator.vibrate(100)
                break
            case 'success':
                // Double vibration pour succès
                navigator.vibrate([100, 50, 100])
                break
            case 'warning':
                // Vibration longue pour avertissement (ticket déjà scanné)
                navigator.vibrate([200, 100, 200])
                break
            case 'error':
                // Triple vibration courte pour erreur
                navigator.vibrate([100, 50, 100, 50, 100])
                break
            default:
                navigator.vibrate(100)
        }
    } catch (error) {
        console.log('Vibration non supportée:', error)
    }
}

// Watcher pour déclencher vibration et son selon le résultat
watch(() => scanResult.value, (newResult) => {
    if (!newResult) return
    
    if (newResult.valid) {
        triggerScanVibration('success')
        playScanSound('success')
    } else if (newResult.errorCode === 'ALREADY_SCANNED') {
        triggerScanVibration('warning')
        playScanSound('warning')
    } else {
        triggerScanVibration('error')
        playScanSound('error')
    }
}, { immediate: false })

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
