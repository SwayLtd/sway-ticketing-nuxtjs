<template>
    <div class="qr-scanner">
        <div class="camera-container relative bg-black rounded-lg overflow-hidden">
            <!-- Video stream -->
            <video
ref="videoElement" autoplay playsinline muted class="w-full h-64 object-cover"
                :class="{ 'mirror': isFrontCamera }"/>

            <!-- Canvas for processing (hidden) -->
            <canvas ref="canvasElement" style="display: none;"/>

            <!-- Target overlay -->
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="scanner-overlay">
                    <div class="scan-area border-2 border-white rounded-lg relative">
                        <div class="corner corner-tl"/>
                        <div class="corner corner-tr"/>
                        <div class="corner corner-bl"/>
                        <div class="corner corner-br"/>
                    </div>
                </div>
            </div> <!-- Scan indicator -->
            <div v-if="isScanning" class="absolute top-4 left-4 right-4">
                <div class="bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm text-center">
                    {{ scanStatus }}
                </div>
            </div>

            <!-- Scan cooldown indicator -->
            <div v-if="scanCooldownRemaining > 0" class="absolute top-16 left-4 right-4">
                <div class="bg-yellow-500 bg-opacity-90 text-white px-3 py-2 rounded-lg text-sm text-center">
                    Next scan in {{ Math.ceil(scanCooldownRemaining / 1000) }}s
                </div>
            </div>

            <!-- Camera controls -->
            <div class="absolute bottom-4 right-4 flex gap-2">
                <button
class="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                    @click="toggleCamera">
                    <CameraIcon class="h-5 w-5" />
                </button>
                <button
v-if="hasTorch" class="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                    :class="{ 'bg-yellow-500': torchEnabled }"
                    @click="toggleTorch">
                    <BoltIcon class="h-5 w-5" />
                </button>
            </div>
        </div> <!-- Integrated scan result -->
        <div
v-if="lastScanResult" class="scan-result mt-4 p-4 rounded-lg border-2 transition-all duration-300"
            :class="getScanResultClasses(lastScanResult).bg">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="flex-shrink-0">
                        <div
v-if="getScanResultType(lastScanResult) === 'success'"
                            class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        <div
v-else-if="getScanResultType(lastScanResult) === 'warning'"
                            class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div v-else class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </div>
                    </div>
                    <div>
                        <div class="font-semibold" :class="getScanResultClasses(lastScanResult).title">
                            {{ getScanResultType(lastScanResult) === 'success' ? 'Valid Ticket' :
                                getScanResultType(lastScanResult) === 'warning' ? 'Warning' : 'Invalid Ticket' }}
                        </div>
                        <div class="text-sm" :class="getScanResultClasses(lastScanResult).message">
                            {{ getScanResultMessage(lastScanResult) }}
                        </div>
                    </div>
                </div>
                <button class="text-gray-400 hover:text-gray-600" @click="clearScanResult">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Manual input -->
        <div class="manual-input mt-4">
            <div class="flex gap-2">
                <input
v-model="manualQR" placeholder="Or enter the code manually" class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    @keyup.enter="handleManualScan" >
                <button
:disabled="!manualQR.trim()" class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md"
                    @click="handleManualScan">
                    Scan
                </button>
            </div>
        </div> <!-- Error messages -->
        <div v-if="cameraError" class="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
            <p class="text-sm text-red-600">{{ cameraError }}</p>
            <button class="mt-2 text-sm text-red-700 underline hover:no-underline" @click="startCamera">
                Retry
            </button>
        </div>

        <!-- HTTPS info for mobile -->
        <div v-if="showHTTPSWarning" class="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
            <p class="text-sm text-blue-600">
                📱 <strong>On mobile:</strong> Camera access requires HTTPS.
                If you encounter issues, ask the organizer for the HTTPS link.
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

// DOM references
const videoElement = ref(null)
const canvasElement = ref(null)

// State
const manualQR = ref('')
const cameraError = ref('')
const scanStatus = ref('Looking for QR code...')
const isFrontCamera = ref(false)
const hasTorch = ref(false)
const torchEnabled = ref(false)
const showHTTPSWarning = ref(false)
const lastScanResult = ref(null)
const lastScanTime = ref(0)
const scanCooldown = 3000 // 3 seconds minimum between scans
const scanCooldownRemaining = ref(0)

// Streaming variables
let stream = null
let scanningInterval = null

// Detect if HTTPS is required
const checkHTTPSRequirement = () => {
    if (import.meta.client) {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        const isHTTP = window.location.protocol === 'http:'
        const isNotLocalhost = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')

        showHTTPSWarning.value = isMobile && isHTTP && isNotLocalhost
    }
}
let currentTrack = null

// Methods
const checkCameraPermissions = async () => {
    try {
        // Check if permissions are already granted
        const permissions = await navigator.permissions.query({ name: 'camera' })
        return permissions.state === 'granted'
    } catch (error) {
        console.log('Permissions API not supported')
        return false
    }
}

const startCamera = async () => {
    try {
        cameraError.value = ''
        scanStatus.value = 'Requesting camera access...'        // Check media support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia not supported by this browser')
        }

        // Check permissions first (if supported)
        const hasPermission = await checkCameraPermissions()
        if (!hasPermission) {
            scanStatus.value = 'Please allow camera access'
        }

        // Camera preferences (back by default)
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

            // Check camera capabilities
            currentTrack = stream.getVideoTracks()[0]
            const capabilities = currentTrack.getCapabilities()
            hasTorch.value = !!capabilities.torch

            scanStatus.value = 'Looking for QR code...'
        }

        startScanning()
    } catch (error) {
        console.error('Camera error:', error)

        // Specific error messages
        if (error.name === 'NotAllowedError') {
            cameraError.value = 'Camera access denied. Please allow access in your browser settings.'
        } else if (error.name === 'NotFoundError') {
            cameraError.value = 'No camera found on this device.'
        } else if (error.name === 'NotReadableError') {
            cameraError.value = 'The camera is already in use by another application.'
        } else if (error.name === 'OverconstrainedError') {
            cameraError.value = 'Unable to satisfy camera constraints.'
        } else if (error.message.includes('getUserMedia not supported')) {
            cameraError.value = 'Your browser does not support camera access. Try Chrome, Firefox, or Safari.'
        } else {
            cameraError.value = `Camera error: ${error.message}. On mobile, make sure you are using HTTPS.`
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
    console.log('startScanning called, props.isScanning:', props.isScanning)
    if (!props.isScanning) return

    console.log('Starting scan with 100ms interval')
    scanningInterval = setInterval(() => {
        scanQRCode()
    }, 100) // Scan every 100ms
}

const stopScanning = () => {
    if (scanningInterval) {
        clearInterval(scanningInterval)
        scanningInterval = null
    }
}

const scanQRCode = () => {
    if (!videoElement.value || !canvasElement.value || !props.isScanning) {
        console.log('scanQRCode stopped:', {
            hasVideo: !!videoElement.value,
            hasCanvas: !!canvasElement.value,
            isScanning: props.isScanning
        })
        return
    }

    const canvas = canvasElement.value
    const context = canvas.getContext('2d')
    const video = videoElement.value

    // Check that the video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        console.log('Video not ready, readyState:', video.readyState)
        return
    } canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
    })

    if (code) {
        const now = Date.now()

        // Check minimum delay since last scan
        if (now - lastScanTime.value < scanCooldown) {
            console.log('Scan ignored - too close to previous:', now - lastScanTime.value, 'ms')
            return
        }
        console.log('QR Code detected:', code.data)
        lastScanTime.value = now

        // Start countdown for next scan
        startScanCooldown()

        emit('qr-scanned', code.data)

        // Temporarily stop scanning to avoid double detections
        stopScanning()
        setTimeout(() => {
            if (props.isScanning) {
                startScanning()
            }
        }, 1000)
    } else {
        // Periodic log to show scanning is working
        if (Math.random() < 0.01) { // 1% chance to log
            console.log('Scanning... no QR found')
        }
    }
}

const handleManualScan = () => {
    console.log('handleManualScan called, value:', manualQR.value.trim())
    if (manualQR.value.trim()) {
        console.log('Emitting qr-scanned with:', manualQR.value.trim())
        emit('qr-scanned', manualQR.value.trim())
        manualQR.value = ''
    } else {
        console.log('Manual value empty')
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
        console.error('Torch error:', error)
        torchEnabled.value = false
    }
}

const getScanResultMessage = (result) => {
    if (!result) return ''

    if (result.valid) {
        if (result.ticket) {
            return `Ticket #${result.ticket.id}`
        }
        return 'Access granted'
    } else {
        switch (result.reason) {
            case 'ticket_not_found':
                return 'Ticket not found'
            case 'ticket_already_scanned':
                return 'Ticket already scanned'
            case 'ticket_expired':
                return 'Ticket expired'
            case 'wrong_event':
                return 'Wrong event'
            case 'scan_error':
                return 'Scan error'
            default:
                if (result.errorCode === 'ALREADY_SCANNED') {
                    // Accept both French and English for compatibility
                    if (
                        result.message &&
                        result.message !== 'Ticket déjà scanné' &&
                        result.message !== 'Ticket already scanned'
                    ) {
                        return result.message
                    }
                    // Otherwise, build the message
                    let message = 'Ticket already scanned'
                    if (result.scanned_at) {
                        const scanDate = new Date(result.scanned_at)
                        message += ` on ${scanDate.toLocaleDateString()} at ${scanDate.toLocaleTimeString()}`
                    }
                    if (result.scanned_by && result.scanned_by.name) {
                        message += ` by ${result.scanned_by.name}`
                    }
                    return message
                }
                return result.message || 'Unknown reason'
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

    // Ticket already scanned = warning (orange/yellow)
    if (result.errorCode === 'ALREADY_SCANNED' || result.reason === 'ticket_already_scanned') {
        return 'warning'
    }

    // Other errors = error (red)
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

// Lifecycle
onMounted(async () => {
    checkHTTPSRequirement()
    await startCamera()
})

onUnmounted(() => {
    stopCamera()
})

// Watcher to start/stop scanning
watch(() => props.isScanning, (newVal) => {
    console.log('props.isScanning changed:', newVal)
    if (newVal) {
        console.log('Starting scanning...')
        startScanning()
    } else {
        console.log('Stopping scanning...')
        stopScanning()
    }
})

// Watcher to display scan result
watch(() => props.scanResult, (newResult) => {
    if (newResult) {
        lastScanResult.value = newResult
        // Auto-clear after 3 seconds for any result
        setTimeout(() => {
            if (lastScanResult.value === newResult) {
                clearScanResult()
            }
        }, 3000)
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

/* Animation for corners */
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

/* Responsive styles */
@media (max-width: 640px) {
    .scanner-overlay {
        width: 200px;
        height: 200px;
    }
}
</style>
