<template>
    <div class="scanner-interface min-h-screen bg-gray-100">
        <!-- Authentification -->
        <ScannerAuth v-if="!isAuthenticated" @authenticated="handleAuth" />

        <!-- Interface de scan -->
        <div v-else class="scanner-app">
            <!-- Header -->
            <ScannerHeader :event="currentEvent" :scanner="currentScanner" :stats="scannerStats" />

            <!-- Statut de connexion et session -->
            <div class="bg-white border-b border-gray-200 px-4 py-2">
                <div class="flex justify-between items-center text-sm">
                    <div class="flex items-center space-x-4">
                        <span :class="[
                            'flex items-center',
                            isOnline ? 'text-green-600' : 'text-red-600'
                        ]">
                            <span :class="[
                                'w-2 h-2 rounded-full mr-2',
                                isOnline ? 'bg-green-500' : 'bg-red-500'
                            ]"></span>
                            {{ isOnline ? 'En ligne' : 'Hors ligne' }}
                        </span>
                        <span v-if="hasOfflineQueue" class="text-orange-600">
                            Scans en attente
                        </span>
                    </div>

                    <div class="flex items-center space-x-4">
                        <span v-if="sessionInfo.isValid" class="text-gray-600">
                            Session expire dans {{ formatTimeRemaining(sessionInfo.timeRemaining) }}
                        </span>
                        <button @click="logout" class="text-red-600 hover:text-red-800 font-medium">
                            Déconnexion
                        </button>
                    </div>
                </div>
            </div>

            <!-- Scanner QR -->
            <div class="max-w-2xl mx-auto p-4">
                <QRScanner @qr-scanned="handleQRScan" @clear-result="clearScanResult" :is-scanning="isScanning"
                    :scan-result="scanResult" :event-id="currentEvent?.id" :scanner-id="currentScanner?.id"
                    :is-online="isOnline" />

                <!-- Statistiques en temps réel -->
                <ScannerStats :stats="scannerStats" />

                <!-- Préférences utilisateur -->
                <div class="mt-6">
                    <ScannerPreferences :vibration-enabled="vibrationEnabled" @toggle-vibration="toggleVibration" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useScannerSecure } from '~/composables/useScannerSecure'
import { useScannerSound } from '~/composables/useScannerSound'

// Import des composants
import ScannerAuth from '~/components/scanner/ScannerAuth.vue'
import ScannerHeader from '~/components/scanner/ScannerHeader.vue'
import QRScanner from '~/components/scanner/QRScanner.vue'
import ScannerStats from '~/components/scanner/ScannerStats.vue'
import ScannerPreferences from '~/components/scanner/ScannerPreferences.vue'

// Composable principal sécurisé
const {
    isAuthenticated,
    currentEvent,
    currentScanner,
    isOnline,
    isScanning,
    scanResult,
    sessionInfo,
    scannerStats,
    hasOfflineQueue,
    authenticate,
    logout,
    scanQRCode,
    checkSessionValidity
} = useScannerSecure()

// Composable pour le feedback sonore
const {
    soundEnabled,
    initAudioContext,
    loadSoundPreferences,
    playScanSound
} = useScannerSound()

// Préférences utilisateur
const vibrationEnabled = ref(true)

// Gestion de l'authentification
const handleAuth = async (authData) => {
    try {
        await authenticate(authData)
        console.log('Authentification réussie')
    } catch (error) {
        console.error('Erreur authentification:', error)
        // Afficher une erreur à l'utilisateur
    }
}

// Gestion du scan QR avec feedback
const handleQRScan = async (qrData) => {
    console.log('Page scanner: QR scanné:', qrData)

    // Déclencher feedback pour la détection du QR
    triggerScanVibration('detection')
    playScanSound('detection')

    // Effectuer le scan sécurisé
    await scanQRCode(qrData)
}

// Fonction pour effacer le résultat
const clearScanResult = () => {
    // Le scanResult est géré par le composable sécurisé
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
    } else if (newResult.reason === 'Ticket déjà scanné') {
        triggerScanVibration('warning')
        playScanSound('warning')
    } else {
        triggerScanVibration('error')
        playScanSound('error')
    }
}, { immediate: false })

// Formater le temps restant pour la session
const formatTimeRemaining = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
        return `${hours}h ${minutes % 60}min`
    } else {
        return `${minutes}min`
    }
}

// Sauvegarder les préférences
const toggleVibration = () => {
    vibrationEnabled.value = !vibrationEnabled.value
    if (process.client) {
        localStorage.setItem('scanner-vibration-enabled', JSON.stringify(vibrationEnabled.value))
    }
}

// Gestion PWA et initialisation
onMounted(() => {
    if (process.client) {
        // Charger les préférences depuis localStorage
        const savedVibration = localStorage.getItem('scanner-vibration-enabled')
        if (savedVibration !== null) {
            vibrationEnabled.value = JSON.parse(savedVibration)
        }

        // Initialiser le contexte audio et charger les préférences sonores
        initAudioContext()
        loadSoundPreferences()

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
