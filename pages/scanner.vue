<template>
    <div class="scanner-interface min-h-screen bg-gray-100">
        <!-- Authentication -->
        <ScannerAuth v-if="!isAuthenticated" @authenticated="handleAuth" />

        <!-- Scanner Interface -->
        <div v-else class="scanner-app flex flex-col" style="height: 100dvh;">
            <!-- Connection and Session Status -->
            <div class="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-10 flex-shrink-0">
                <div class="flex justify-between items-center text-sm max-w-2xl mx-auto">
                    <div class="flex items-center space-x-4">
                        <span
:class="[
                            'flex items-center',
                            isOnline ? 'text-green-600' : 'text-red-600'
                        ]">
                            <span
:class="[
                                'w-2 h-2 rounded-full mr-2',
                                isOnline ? 'bg-green-500' : 'bg-red-500'
                            ]"/>
                            {{ isOnline ? 'Online' : 'Offline' }}
                        </span>
                        <span class="text-md text-gray-600">{{ currentScanner?.name }}</span>
                        <span v-if="hasOfflineQueue" class="text-orange-600">
                            Pending Scans
                        </span>
                    </div>

                    <div class="flex items-center space-x-4">
                        <span v-if="sessionInfo.isValid" class="text-gray-600">
                            Expires in {{ formatTimeRemaining(sessionInfo.timeRemaining) }}
                        </span>
                        <button class="text-red-600 hover:text-red-800 font-medium" @click="logout">
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="flex-grow overflow-y-auto p-4">
                <div class="max-w-2xl mx-auto">
                    <!-- QR Scanner -->
                    <QRScanner
:is-scanning="isScanning" :scan-result="scanResult" :event-id="currentEvent?.id"
                        :scanner-id="currentScanner?.id" :is-online="isOnline" @qr-scanned="handleQRScan"
                        @clear-result="clearScanResult" />

                    <!-- Info and Stats -->
                    <div class="mt-6 space-y-4">
                        <div class="text-center">
                            <h1 class="text-xl font-semibold text-gray-800">{{ currentEvent?.title }}</h1>
                        </div>
                        <ScannerStats :stats="scannerStats" />
                    </div>

                    <!-- User Preferences -->
                    <div class="mt-6">
                        <ScannerPreferences :vibration-enabled="vibrationEnabled" @toggle-vibration="toggleVibration" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useScannerSecure } from '~/composables/useScannerSecure'
import { useScannerSound } from '~/composables/useScannerSound'

// Component Imports
import ScannerAuth from '~/components/scanner/ScannerAuth.vue'
import QRScanner from '~/components/scanner/QRScanner.vue'
import ScannerStats from '~/components/scanner/ScannerStats.vue'
import ScannerPreferences from '~/components/scanner/ScannerPreferences.vue'

// Main secure composable
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

// Composable for sound feedback
const {
    soundEnabled,
    initAudioContext,
    loadSoundPreferences,
    playScanSound
} = useScannerSound()

// User Preferences
const vibrationEnabled = ref(false)

// Authentication management
const handleAuth = async (authData) => {
    try {
        await authenticate(authData)
        console.log('Authentication successful')
    } catch (error) {
        console.error('Authentication error:', error)
        // Display an error to the user
    }
}

// QR scan management with feedback
const handleQRScan = async (qrData) => {
    console.log('Scanner page: QR scanned:', qrData)

    // Trigger feedback for QR detection
    triggerScanVibration('detection')
    playScanSound('detection')

    // Perform secure scan
    await scanQRCode(qrData)
}

// Function to clear the result
const clearScanResult = () => {
    // scanResult is managed by the secure composable
}

// Function to manage vibrations based on context
const triggerScanVibration = (type) => {
    if (!import.meta.client || !('vibrate' in navigator) || !vibrationEnabled.value) return

    try {
        switch (type) {
            case 'detection':
                // Short vibration for QR detection
                navigator.vibrate(100)
                break
            case 'success':
                // Double vibration for success
                navigator.vibrate([100, 50, 100])
                break
            case 'warning':
                // Long vibration for warning (ticket already scanned)
                navigator.vibrate([200, 100, 200])
                break
            case 'error':
                // Triple short vibration for error
                navigator.vibrate([100, 50, 100, 50, 100])
                break
            default:
                navigator.vibrate(100)
        }
    } catch (error) {
        console.log('Vibration not supported:', error)
    }
}

// Watcher to trigger vibration and sound based on the result
watch(() => scanResult.value, (newResult) => {
    if (!newResult) return

    if (newResult.valid) {
        triggerScanVibration('success')
        playScanSound('success')
    } else if (newResult.reason === 'Ticket already scanned') { // This string might come from the backend and needs to be updated there as well
        triggerScanVibration('warning')
        playScanSound('warning')
    } else {
        triggerScanVibration('error')
        playScanSound('error')
    }
}, { immediate: false })

// Format remaining session time
const formatTimeRemaining = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
        return `${hours}h ${minutes % 60}min`
    } else {
        return `${minutes}min`
    }
}

// Save preferences
const toggleVibration = () => {
    vibrationEnabled.value = !vibrationEnabled.value
    if (import.meta.client) {
        localStorage.setItem('scanner-vibration-enabled', JSON.stringify(vibrationEnabled.value))
    }
}

// PWA management and initialization
onMounted(() => {
    if (import.meta.client) {
        // Always force vibration off at startup
        vibrationEnabled.value = false
        localStorage.setItem('scanner-vibration-enabled', 'false')

        // Initialize audio context and load sound preferences
        initAudioContext()
        loadSoundPreferences()

        // Register service worker if available
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration)
                })
                .catch(error => {
                    console.error('Service Worker error:', error)
                })
        }

        // Disable zoom on mobile devices
        const viewport = document.querySelector('meta[name=viewport]')
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        }
    }

    if (import.meta.client && vibrationEnabled.value && 'vibrate' in navigator) {
        try {
            navigator.vibrate(100)
        } catch (e) {
            // ignore
        }
    }
})

onUnmounted(() => {
    // Cleanup if necessary
})

// Define empty layout for a full-screen experience
definePageMeta({
    layout: false
})

// Meta for PWA
useHead({
    title: 'Sway Scanner',
    meta: [
        { name: 'description', content: 'Sway Ticket Scanner' },
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

/* Prevent zoom on inputs on iOS */
input[type="text"],
input[type="email"] {
    font-size: 16px;
}

/* Style for mobile devices */
@media (max-width: 768px) {
    .scanner-app {
        padding-bottom: 20px;
    }
}
</style>
