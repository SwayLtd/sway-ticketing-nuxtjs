import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

export interface Scanner {
    id: string
    name: string
    event_id: number
    user_id?: string
    is_active: boolean
    created_at: string
}

export interface Event {
    id: number
    name: string
    description?: string
    start_date: string
    end_date: string
}

export interface ScanStats {
    totalScanned: number
    validScans: number
    invalidScans: number
    offlineScans: number
}

export interface OfflineQueueItem {
    ticketId: string
    scannedAt: Date
    attempts: number
    lastError?: string
}

export interface ScanResult {
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

export interface AuthResponse {
    success: boolean
    scanner?: Scanner
    event?: Event
    error?: string
}

export interface SyncResponse {
    success: boolean
    results?: Array<{
        success: boolean
        ticket_id: string
        error?: string
    }>
}

export const useScanner = () => {
    // État de base
    const isAuthenticated = ref(false)
    const currentEvent = ref<Event | null>(null)
    const currentScanner = ref<Scanner | null>(null)
    const isOnline = ref(process.client ? navigator.onLine : true)
    const isSyncing = ref(false)
    const isScanning = ref(false)
    const scanResult = ref<ScanResult | null>(null)
    const lastSyncTime = ref<Date | null>(null)

    // Statistiques
    const scannerStats = reactive<ScanStats>({
        totalScanned: 0,
        validScans: 0,
        invalidScans: 0,
        offlineScans: 0
    })

    // Queue offline
    const offlineQueue = ref<OfflineQueueItem[]>([])

    // Listeners pour la connexion
    const handleOnline = () => {
        isOnline.value = true
        // Auto-sync quand on revient en ligne
        if (offlineQueue.value.length > 0) {
            syncOfflineScans()
        }
    }

    const handleOffline = () => {
        isOnline.value = false
    }    // Authentification
    const handleAuth = async (authData: { eventId: string; authToken: string }) => {
        console.log('handleAuth appelé avec:', authData)

        // Utiliser le scanner existant dans la base de données
        currentScanner.value = {
            id: 'ee0fb6a8-3e2a-43ad-9f89-754bef016805', // UUID du scanner existant
            name: 'Scanner Existant',
            event_id: parseInt(authData.eventId),
            is_active: true,
            created_at: new Date().toISOString()
        }

        currentEvent.value = {
            id: parseInt(authData.eventId),
            name: 'Événement Test',
            description: 'Événement de test',
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString()
        }

        isAuthenticated.value = true

        // Activer le scanning dès l'authentification
        console.log('Activation du scanning après authentification')
        isScanning.value = true
        console.log('isScanning maintenant:', isScanning.value)

        // Charger les données de l'événement si en ligne
        if (isOnline.value) {
            await downloadEventData()
        }

        // Charger les stats et queue depuis le localStorage
        loadFromLocalStorage()
    }

    // Scan QR Code
    const handleQRScan = async (qrData: string) => {
        console.log('handleQRScan appelé avec:', qrData)
        if (!currentEvent.value?.id || !currentScanner.value?.id) {
            console.error('Événement ou scanner non configuré')
            return
        }

        // Ne pas désactiver le scanning pendant le traitement
        const wasScanning = isScanning.value
        console.log('État scanning avant traitement:', wasScanning)

        try {
            if (isOnline.value) {
                // Scan en ligne
                const response = await $fetch('/api/scanner/validate-qr', {
                    method: 'POST',
                    body: {
                        qrData,
                        eventId: currentEvent.value.id,
                        scannerId: currentScanner.value.id
                    }
                })

                scanResult.value = response
                updateStats(response)
            } else {
                // Scan hors ligne - ajouter à la queue
                const offlineItem: OfflineQueueItem = {
                    ticketId: qrData, // On suppose que le QR contient l'ID du ticket
                    scannedAt: new Date(),
                    attempts: 0
                }

                offlineQueue.value.push(offlineItem)
                scannerStats.offlineScans++

                // Résultat offline générique
                scanResult.value = {
                    valid: true,
                    reason: 'offline_scan'
                }

                saveToLocalStorage()
            }
        } catch (error) {
            console.error('Erreur lors du scan:', error)
            scanResult.value = {
                valid: false,
                reason: 'scan_error'
            }
        }

        // Remettre l'état de scanning si nécessaire
        if (wasScanning) {
            isScanning.value = true
        }
    }

    // Synchronisation offline
    const syncOfflineScans = async () => {
        if (!isOnline.value || isSyncing.value || offlineQueue.value.length === 0) {
            return
        }

        if (!currentScanner.value?.id) {
            console.error('Scanner non configuré')
            return
        }

        isSyncing.value = true

        try {
            const response = await $fetch<SyncResponse>('/api/scanner/sync-offline', {
                method: 'POST',
                body: {
                    scannedTickets: offlineQueue.value.map(item => ({
                        ticketId: item.ticketId,
                        scannedAt: item.scannedAt.toISOString()
                    })),
                    scannerId: currentScanner.value.id
                }
            })

            // Traiter les résultats
            if (response.results) {
                const successfulSyncs = response.results.filter(r => r.success)
                const failedSyncs = response.results.filter(r => !r.success)

                // Supprimer les scans synchronisés avec succès
                const successfulTicketIds = successfulSyncs.map(r => r.ticket_id)
                offlineQueue.value = offlineQueue.value.filter(
                    item => !successfulTicketIds.includes(item.ticketId)
                )

                // Marquer les échecs
                failedSyncs.forEach(failedResult => {
                    const queueItem = offlineQueue.value.find(
                        item => item.ticketId === failedResult.ticket_id
                    )
                    if (queueItem) {
                        queueItem.attempts++
                        queueItem.lastError = failedResult.error
                    }
                })

                // Mettre à jour les stats
                scannerStats.offlineScans = offlineQueue.value.length
                lastSyncTime.value = new Date()

                saveToLocalStorage()
            }
        } catch (error) {
            console.error('Erreur lors de la synchronisation:', error)
            // Marquer toutes les tentatives comme échouées
            offlineQueue.value.forEach(item => {
                item.attempts++
                item.lastError = 'Erreur réseau'
            })
        } finally {
            isSyncing.value = false
        }
    }    // Mettre à jour les statistiques
    const updateStats = (result: ScanResult) => {
        scannerStats.totalScanned++
        if (result.valid) {
            scannerStats.validScans++
        } else {
            scannerStats.invalidScans++
        }
        saveToLocalStorage()
    }// Scan suivant
    const nextScan = () => {
        scanResult.value = null
        // Optionnel: focus sur le scanner ou autre action
    }

    // Supprimer un élément de la queue
    const removeFromOfflineQueue = (ticketId: string) => {
        offlineQueue.value = offlineQueue.value.filter(item => item.ticketId !== ticketId)
        saveToLocalStorage()
    }

    // Effacer le résultat de scan
    const clearScanResult = () => {
        scanResult.value = null
    }

    // Télécharger les données de l'événement
    const downloadEventData = async () => {
        if (!currentEvent.value?.id) return

        try {
            const eventData = await $fetch(`/api/scanner/event-data/${currentEvent.value.id}`)
            // Sauvegarder en cache local pour l'utilisation offline
            localStorage.setItem(`event-data-${currentEvent.value.id}`, JSON.stringify(eventData))
        } catch (error) {
            console.error('Erreur lors du téléchargement des données:', error)
        }
    }

    // Sauvegarde localStorage
    const saveToLocalStorage = () => {
        if (currentScanner.value) {
            const data = {
                stats: scannerStats,
                offlineQueue: offlineQueue.value,
                lastSyncTime: lastSyncTime.value
            }
            localStorage.setItem(`scanner-${currentScanner.value.id}`, JSON.stringify(data))
        }
    }

    // Chargement localStorage
    const loadFromLocalStorage = () => {
        if (currentScanner.value) {
            const stored = localStorage.getItem(`scanner-${currentScanner.value.id}`)
            if (stored) {
                try {
                    const data = JSON.parse(stored)
                    Object.assign(scannerStats, data.stats || {})
                    offlineQueue.value = (data.offlineQueue || []).map((item: any) => ({
                        ...item,
                        scannedAt: new Date(item.scannedAt)
                    }))
                    lastSyncTime.value = data.lastSyncTime ? new Date(data.lastSyncTime) : null
                } catch (error) {
                    console.error('Erreur lors du chargement des données locales:', error)
                }
            }
        }
    }    // Lifecycle
    onMounted(() => {
        if (process.client) {
            // Mettre à jour l'état de connexion
            isOnline.value = navigator.onLine

            // Ajouter les listeners
            window.addEventListener('online', handleOnline)
            window.addEventListener('offline', handleOffline)
        }
    })

    onUnmounted(() => {
        if (process.client) {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    })

    return {
        // État
        isAuthenticated,
        currentEvent,
        currentScanner,
        isOnline,
        isSyncing,
        isScanning,
        scanResult,
        lastSyncTime,
        scannerStats,
        offlineQueue,

        // Actions
        handleAuth,
        handleQRScan,
        syncOfflineScans,
        removeFromOfflineQueue,
        clearScanResult,
        nextScan,
        downloadEventData
    }
}
