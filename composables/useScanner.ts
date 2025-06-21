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
    session_token?: string
    expires_at?: string
    scanner?: Scanner
    event?: Event
    error?: string
    hmacKey?: string
}

export interface SessionStatus {
    valid: boolean
    scanner_id?: string
    event_id?: number
    expires_at?: string
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

    // Gestion des sessions sécurisées
    const sessionToken = ref<string | null>(null)
    const sessionExpiresAt = ref<Date | null>(null)
    const hmacKey = ref<string | null>(null)

    // Statistiques
    const scannerStats = reactive<ScanStats>({
        totalScanned: 0,
        validScans: 0,
        invalidScans: 0,
        offlineScans: 0
    })

    // Queue offline
    const offlineQueue = ref<OfflineQueueItem[]>([])

    // Fonction de déconnexion
    const logout = async () => {
        if (sessionToken.value) {
            try {
                await $fetch('/api/scanner/session', {
                    method: 'DELETE',
                    body: { session_token: sessionToken.value }
                })
            } catch (error) {
                console.error('Error revoking session:', error)
            }
        }

        isAuthenticated.value = false
        currentEvent.value = null
        currentScanner.value = null
        sessionToken.value = null
        sessionExpiresAt.value = null
        hmacKey.value = null
        scannerStats.totalScanned = 0
        scannerStats.validScans = 0
        scannerStats.invalidScans = 0
        scannerStats.offlineScans = 0

        // Nettoyer le localStorage
        if (process.client) {
            localStorage.removeItem('scanner_session')
            localStorage.removeItem('scanner_stats')
            localStorage.removeItem('offline_queue')
        }
    }

    // Vérification automatique de la session
    const checkSessionValidity = async (): Promise<boolean> => {
        if (!sessionToken.value) {
            return false
        }

        // Vérifier l'expiration côté client
        if (sessionExpiresAt.value && new Date() > sessionExpiresAt.value) {
            await logout()
            return false
        }

        try {
            const response = await $fetch<SessionStatus>('/api/scanner/session', {
                method: 'GET',
                query: { session_token: sessionToken.value }
            })

            return response?.valid || false
        } catch (error) {
            console.error('Session validation failed:', error)
            await logout()
            return false
        }
    }

    // Listeners pour la connexion
    const handleOnline = () => {
        isOnline.value = true
        // Vérifier la session quand on revient en ligne
        if (sessionToken.value) {
            checkSessionValidity()
        }
        // Auto-sync quand on revient en ligne
        if (offlineQueue.value.length > 0) {
            syncOfflineScans()
        }
    }

    const handleOffline = () => {
        isOnline.value = false
    }    // Authentification sécurisée
    const handleAuth = async (authData: { eventId: string; authToken: string }): Promise<AuthResponse> => {
        try {
            console.log('handleAuth appelé avec:', authData)

            const response = await $fetch<AuthResponse>('/api/scanner/authenticate', {
                method: 'POST',
                body: {
                    eventId: parseInt(authData.eventId),
                    authToken: authData.authToken
                }
            })

            if (response.success && response.session_token) {
                // Stocker les informations de session
                sessionToken.value = response.session_token
                sessionExpiresAt.value = response.expires_at ? new Date(response.expires_at) : null
                hmacKey.value = response.hmacKey || null

                // Mettre à jour l'état
                currentScanner.value = response.scanner || null
                currentEvent.value = response.event || null
                isAuthenticated.value = true

                // Activer le scanning dès l'authentification
                console.log('Activation du scanning après authentification sécurisée')
                isScanning.value = true

                // Sauvegarder en localStorage pour la persistance
                if (process.client) {
                    localStorage.setItem('scanner_session', JSON.stringify({
                        sessionToken: sessionToken.value,
                        expiresAt: sessionExpiresAt.value?.toISOString(),
                        scanner: currentScanner.value,
                        event: currentEvent.value,
                        hmacKey: hmacKey.value
                    }))
                }

                return response
            } else {
                throw new Error(response.error || 'Authentication failed')
            }
        } catch (error: any) {
            console.error('Erreur d\'authentification:', error)
            throw new Error(error.message || 'Authentication failed')
        }
    }

    // Restaurer la session depuis localStorage
    const restoreSession = () => {
        if (!process.client) return

        try {
            const savedSession = localStorage.getItem('scanner_session')
            if (savedSession) {
                const session = JSON.parse(savedSession)

                // Vérifier si la session n'est pas expirée
                if (session.expiresAt && new Date() < new Date(session.expiresAt)) {
                    sessionToken.value = session.sessionToken
                    sessionExpiresAt.value = session.expiresAt ? new Date(session.expiresAt) : null
                    currentScanner.value = session.scanner
                    currentEvent.value = session.event
                    hmacKey.value = session.hmacKey
                    isAuthenticated.value = true

                    // Vérifier la validité côté serveur
                    checkSessionValidity()
                } else {
                    // Session expirée, nettoyer
                    localStorage.removeItem('scanner_session')
                }
            }
        } catch (error) {
            console.error('Error restoring session:', error)
            localStorage.removeItem('scanner_session')
        }
    }

    // Scan QR Code sécurisé
    const handleQRScan = async (qrData: string) => {
        console.log('handleQRScan appelé avec:', qrData)
        if (!currentEvent.value?.id || !currentScanner.value?.id) {
            console.error('Événement ou scanner non configuré')
            return
        }

        // Vérifier la validité de la session avant le scan
        if (sessionToken.value && !(await checkSessionValidity())) {
            console.error('Session invalide, authentification requise')
            return
        }

        try {
            if (isOnline.value) {
                // Scan en ligne avec token de session
                const response = await $fetch('/api/scanner/validate-qr', {
                    method: 'POST',
                    body: {
                        qrData,
                        eventId: currentEvent.value.id,
                        sessionToken: sessionToken.value,
                        scannerId: currentScanner.value.id // Fallback pour compatibilité
                    }
                })

                scanResult.value = response
                updateStats(response)
            } else {
                // Mode offline - stocker dans la queue
                const offlineItem: OfflineQueueItem = {
                    ticketId: qrData,
                    scannedAt: new Date(),
                    attempts: 0
                }

                offlineQueue.value.push(offlineItem)
                scannerStats.offlineScans++

                // Résultat offline optimiste
                scanResult.value = {
                    valid: true,
                    reason: 'offline_scan'
                }
            }
        } catch (error: any) {
            console.error('Erreur scan QR:', error)
            scanResult.value = {
                valid: false,
                reason: error.message || 'Erreur de scan'
            }
        }

        console.log('Résultat scan:', scanResult.value)

        // Sauvegarder les stats
        saveToLocalStorage()
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
