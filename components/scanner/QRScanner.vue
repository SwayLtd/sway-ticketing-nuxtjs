<template>
    <div class="qr-scanner">
        <div class="camera-container relative bg-black rounded-lg overflow-hidden">
            <!-- Video stream -->
            <video ref="videoElement" autoplay playsinline muted class="w-full h-64 object-cover"
                :class="{ 'mirror': isFrontCamera }"></video>

            <!-- Canvas pour le traitement (caché) -->
            <canvas ref="canvasElement" style="display: none;"></canvas>

            <!-- Overlay de visée -->
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="scanner-overlay">
                    <div class="scan-area border-2 border-white rounded-lg relative">
                        <div class="corner corner-tl"></div>
                        <div class="corner corner-tr"></div>
                        <div class="corner corner-bl"></div>
                        <div class="corner corner-br"></div>
                    </div>
                </div>
            </div>            <!-- Indicateur de scan -->
            <div v-if="isScanning" class="absolute top-4 left-4 right-4">
                <div class="bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm text-center">
                    {{ scanStatus }}
                </div>
            </div>

            <!-- Indicateur de délai de scan -->
            <div v-if="scanCooldownRemaining > 0" class="absolute top-16 left-4 right-4">
                <div class="bg-yellow-500 bg-opacity-90 text-white px-3 py-2 rounded-lg text-sm text-center">
                    Prochain scan dans {{ Math.ceil(scanCooldownRemaining / 1000) }}s
                </div>
            </div>

            <!-- Contrôles caméra -->
            <div class="absolute bottom-4 right-4 flex gap-2">
                <button @click="toggleCamera"
                    class="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70">
                    <CameraIcon class="h-5 w-5" />
                </button>
                <button @click="toggleTorch" v-if="hasTorch"
                    class="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                    :class="{ 'bg-yellow-500': torchEnabled }">
                    <BoltIcon class="h-5 w-5" />
                </button>
            </div>        </div>        <!-- Résultat du scan intégré -->
        <div v-if="lastScanResult" class="scan-result mt-4 p-4 rounded-lg border-2 transition-all duration-300" 
             :class="getScanResultClasses(lastScanResult).bg">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                        <div v-if="getScanResultType(lastScanResult) === 'success'" class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <div v-else-if="getScanResultType(lastScanResult) === 'warning'" class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div v-else class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                    </div>
                    <div>
                        <div class="font-semibold" :class="getScanResultClasses(lastScanResult).title">
                            {{ getScanResultType(lastScanResult) === 'success' ? 'Ticket Valide' : 
                               getScanResultType(lastScanResult) === 'warning' ? 'Attention' : 'Ticket Invalide' }}
                        </div>
                        <div class="text-sm" :class="getScanResultClasses(lastScanResult).message">
                            {{ getScanResultMessage(lastScanResult) }}
                        </div>
                    </div>
                </div>
                <button @click="clearScanResult" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Saisie manuelle -->
        <div class="manual-input mt-4">
            <div class="flex gap-2">
                <input v-model="manualQR" @keyup.enter="handleManualScan" placeholder="Ou saisir le code manuellement"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button @click="handleManualScan" :disabled="!manualQR.trim()"
                    class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md">
                    Scanner
                </button>
            </div>
        </div>        <!-- Messages d'erreur -->
        <div v-if="cameraError" class="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p class="text-sm text-red-600">{{ cameraError }}</p>
            <button @click="startCamera" class="mt-2 text-sm text-red-700 underline hover:no-underline">
                Réessayer
            </button>
        </div>

        <!-- Information HTTPS pour mobile -->
        <div class="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3" v-if="showHTTPSWarning">
            <p class="text-sm text-blue-600">
                📱 <strong>Sur mobile :</strong> L'accès à la caméra nécessite HTTPS. 
                Si vous rencontrez des problèmes, demandez le lien HTTPS à l'organisateur.
            </p>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { CameraIcon, BoltIcon } from '@heroicons/vue/24/outline'
import jsQR from 'jsqr'

const emit = defineEmits(['qr-scanned', 'clear-result'])

const props = defineProps({
    isScanning: {
        type: Boolean,
        default: true
    },
    scanResult: {
        type: Object,
        default: null
    }
})

// Références DOM
const videoElement = ref(null)
const canvasElement = ref(null)

// État
const manualQR = ref('')
const cameraError = ref('')
const scanStatus = ref('Recherche de QR code...')
const isFrontCamera = ref(false)
const hasTorch = ref(false)
const torchEnabled = ref(false)
const showHTTPSWarning = ref(false)
const lastScanResult = ref(null)
const lastScanTime = ref(0)
const scanCooldown = 3000 // 3 secondes minimum entre les scans
const scanCooldownRemaining = ref(0)

// Variables pour le streaming
let stream = null
let scanningInterval = null

// Détecter si HTTPS est requis
const checkHTTPSRequirement = () => {
    if (process.client) {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        const isHTTP = window.location.protocol === 'http:'
        const isNotLocalhost = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
        
        showHTTPSWarning.value = isMobile && isHTTP && isNotLocalhost
    }
}
let currentTrack = null

// Méthodes
const checkCameraPermissions = async () => {
    try {
        // Vérifier si les permissions sont déjà accordées
        const permissions = await navigator.permissions.query({ name: 'camera' })
        return permissions.state === 'granted'
    } catch (error) {
        console.log('Permissions API non supportée')
        return false
    }
}

const startCamera = async () => {
    try {
        cameraError.value = ''
        scanStatus.value = 'Demande d\'accès à la caméra...'

        // Vérifier le support des médias
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia non supporté par ce navigateur')
        }

        // Vérifier les permissions d'abord (si supporté)
        const hasPermission = await checkCameraPermissions()
        if (!hasPermission) {
            scanStatus.value = 'Veuillez autoriser l\'accès à la caméra'
        }

        // Préférences caméra (arrière par défaut)
        const constraints = {
            video: {
                facingMode: isFrontCamera.value ? 'user' : 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints)

        await nextTick()
        if (videoElement.value) {
            videoElement.value.srcObject = stream

            // Vérifier les capacités de la caméra
            currentTrack = stream.getVideoTracks()[0]
            const capabilities = currentTrack.getCapabilities()
            hasTorch.value = !!capabilities.torch
            
            scanStatus.value = 'Recherche de QR code...'
        }

        startScanning()
    } catch (error) {
        console.error('Erreur caméra:', error)
        
        // Messages d'erreur spécifiques
        if (error.name === 'NotAllowedError') {
            cameraError.value = 'Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.'
        } else if (error.name === 'NotFoundError') {
            cameraError.value = 'Aucune caméra trouvée sur cet appareil.'
        } else if (error.name === 'NotReadableError') {
            cameraError.value = 'La caméra est déjà utilisée par une autre application.'
        } else if (error.name === 'OverconstrainedError') {
            cameraError.value = 'Impossible de satisfaire les contraintes de la caméra.'
        } else if (error.message.includes('getUserMedia non supporté')) {
            cameraError.value = 'Votre navigateur ne supporte pas l\'accès à la caméra. Essayez avec Chrome, Firefox ou Safari.'
        } else {
            cameraError.value = `Erreur caméra: ${error.message}. Sur mobile, assurez-vous d'utiliser HTTPS.`
        }
    }
}

const stopCamera = () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop())
        stream = null
    }
    stopScanning()
}

const startScanning = () => {
    console.log('startScanning appelé, props.isScanning:', props.isScanning)
    if (!props.isScanning) return

    console.log('Démarrage du scan avec intervalle de 100ms')
    scanningInterval = setInterval(() => {
        scanQRCode()
    }, 100) // Scan toutes les 100ms
}

const stopScanning = () => {
    if (scanningInterval) {
        clearInterval(scanningInterval)
        scanningInterval = null
    }
}

const scanQRCode = () => {
    if (!videoElement.value || !canvasElement.value || !props.isScanning) {
        console.log('scanQRCode arrêté:', {
            hasVideo: !!videoElement.value,
            hasCanvas: !!canvasElement.value,
            isScanning: props.isScanning
        })
        return
    }

    const canvas = canvasElement.value
    const context = canvas.getContext('2d')
    const video = videoElement.value

    // Vérifier que la vidéo est prête
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log('Vidéo pas prête, readyState:', video.readyState)
        return
    }    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
    })

    if (code) {
        const now = Date.now()
        
        // Vérifier le délai minimum depuis le dernier scan
        if (now - lastScanTime.value < scanCooldown) {
            console.log('Scan ignoré - trop proche du précédent:', now - lastScanTime.value, 'ms')
            return
        }
          console.log('QR Code détecté:', code.data)
        lastScanTime.value = now
        
        // Démarrer le compte à rebours pour le prochain scan
        startScanCooldown()
        
        emit('qr-scanned', code.data)

        // Arrêter temporairement le scan pour éviter les doubles détections
        stopScanning()
        setTimeout(() => {
            if (props.isScanning) {
                startScanning()
            }
        }, 1000)
    } else {
        // Log périodique pour montrer que le scan fonctionne
        if (Math.random() < 0.01) { // 1% de chance d'afficher le log
            console.log('Scan en cours... pas de QR trouvé')
        }
    }
}

const handleManualScan = () => {
    console.log('handleManualScan appelé, valeur:', manualQR.value.trim())
    if (manualQR.value.trim()) {
        console.log('Émission de qr-scanned avec:', manualQR.value.trim())
        emit('qr-scanned', manualQR.value.trim())
        manualQR.value = ''
    } else {
        console.log('Valeur manuelle vide')
    }
}

const toggleCamera = async () => {
    stopCamera()
    isFrontCamera.value = !isFrontCamera.value
    await startCamera()
}

const toggleTorch = async () => {
    if (!currentTrack || !hasTorch.value) return

    try {
        torchEnabled.value = !torchEnabled.value
        await currentTrack.applyConstraints({
            advanced: [{ torch: torchEnabled.value }]
        })
    } catch (error) {
        console.error('Erreur torch:', error)
        torchEnabled.value = false
    }
}

const getScanResultMessage = (result) => {
    if (!result) return ''
    
    if (result.valid) {
        if (result.ticket) {
            return `Ticket #${result.ticket.id}`
        }
        return 'Accès autorisé'
    } else {
        switch (result.reason) {
            case 'ticket_not_found':
                return 'Ticket non trouvé'
            case 'ticket_already_scanned':
                return 'Ticket déjà scanné'
            case 'ticket_expired':
                return 'Ticket expiré'
            case 'wrong_event':
                return 'Mauvais événement'
            case 'scan_error':
                return 'Erreur de scan'
            default:                if (result.errorCode === 'ALREADY_SCANNED') {
                    // Utiliser le message formaté de la fonction SQL si disponible
                    if (result.message && result.message !== 'Ticket déjà scanné') {
                        return result.message
                    }
                    
                    // Sinon, formater nous-mêmes
                    let message = 'Ticket déjà scanné'
                    if (result.scanned_at) {
                        const scanDate = new Date(result.scanned_at)
                        message += ` le ${scanDate.toLocaleDateString()} à ${scanDate.toLocaleTimeString()}`
                    }
                    if (result.scanned_by && result.scanned_by.name) {
                        message += ` par ${result.scanned_by.name}`
                    }
                    return message
                }
                return result.message || 'Raison inconnue'
        }
    }
}

const startScanCooldown = () => {
    scanCooldownRemaining.value = scanCooldown
    const interval = setInterval(() => {
        scanCooldownRemaining.value -= 100
        if (scanCooldownRemaining.value <= 0) {
            scanCooldownRemaining.value = 0
            clearInterval(interval)
        }
    }, 100)
}

const getScanResultType = (result) => {
    if (!result) return 'error'
    
    if (result.valid) return 'success'
    
    // Ticket déjà scanné = warning (orange/jaune)
    if (result.errorCode === 'ALREADY_SCANNED' || result.reason === 'ticket_already_scanned') {
        return 'warning'
    }
    
    // Autres erreurs = error (rouge)
    return 'error'
}

const getScanResultClasses = (result) => {
    const type = getScanResultType(result)
    
    switch (type) {
        case 'success':
            return {
                bg: 'bg-green-50 border-green-200',
                icon: 'text-green-500',
                title: 'text-green-800',
                message: 'text-green-600'
            }
        case 'warning':
            return {
                bg: 'bg-yellow-50 border-yellow-200',
                icon: 'text-yellow-500',
                title: 'text-yellow-800',
                message: 'text-yellow-600'
            }
        case 'error':
        default:
            return {
                bg: 'bg-red-50 border-red-200',
                icon: 'text-red-500',
                title: 'text-red-800',
                message: 'text-red-600'
            }
    }
}

const clearScanResult = () => {
    lastScanResult.value = null
    emit('clear-result')
}

// Cycle de vie
onMounted(async () => {
    checkHTTPSRequirement()
    await startCamera()
})

onUnmounted(() => {
    stopCamera()
})

// Watcher pour démarrer/arrêter le scan
watch(() => props.isScanning, (newVal) => {
    console.log('props.isScanning changé:', newVal)
    if (newVal) {
        console.log('Démarrage du scanning...')
        startScanning()
    } else {
        console.log('Arrêt du scanning...')
        stopScanning()
    }
})

// Watcher pour afficher le résultat du scan
watch(() => props.scanResult, (newResult) => {
    if (newResult) {
        lastScanResult.value = newResult
        // Auto-effacer après 5 secondes pour les résultats valides
        if (newResult.valid) {
            setTimeout(() => {
                if (lastScanResult.value === newResult) {
                    clearScanResult()
                }
            }, 5000)
        }
    }
})
</script>

<style scoped>
.scanner-overlay {
    width: 250px;
    height: 250px;
}

.scan-area {
    width: 100%;
    height: 100%;
    position: relative;
}

.corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border: 3px solid #3b82f6;
}

.corner-tl {
    top: -3px;
    left: -3px;
    border-right: none;
    border-bottom: none;
}

.corner-tr {
    top: -3px;
    right: -3px;
    border-left: none;
    border-bottom: none;
}

.corner-bl {
    bottom: -3px;
    left: -3px;
    border-right: none;
    border-top: none;
}

.corner-br {
    bottom: -3px;
    right: -3px;
    border-left: none;
    border-top: none;
}

.mirror {
    transform: scaleX(-1);
}

/* Animation pour les coins */
@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.corner {
    animation: pulse 2s infinite;
}

/* Styles responsive */
@media (max-width: 640px) {
    .scanner-overlay {
        width: 200px;
        height: 200px;
    }
}
</style>
