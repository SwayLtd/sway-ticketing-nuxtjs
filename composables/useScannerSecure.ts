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

export const useScannerSecure = () => {
    // État de base
    const isAuthenticated = ref(false)
    const currentEvent = ref<Event | null>(null)
    const currentScanner = ref<Scanner | null>(null)
    const isOnline = ref(import.meta.client ? navigator.onLine : true)
    const isSyncing = ref(false)
    const isScanning = ref(false)
    const scanResult = ref<ScanResult | null>(null)
    const lastSyncTime = ref<Date | null>(null)

    // Gestion des sessions sécurisées
    const sessionToken = ref<string | null>(null)
    const sessionExpiresAt = ref<Date | null>(null)
    const hmacKey = ref<string | null>(null)
    const lastSessionValidationCheck = ref<number>(0)

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
        if (import.meta.client) {
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
        } try {
            const response = await $fetch<SessionStatus>('/api/scanner/session', {
                method: 'GET',
                query: { session_token: sessionToken.value }
            })

            return response?.valid || false
        } catch (error) {
            console.error('Session validation failed:', error)

            // En développement, si la validation côté serveur échoue mais que le token n'est pas expiré côté client,
            // on fait confiance au client pour éviter les déconnexions intempestives
            if (process.env.NODE_ENV === 'development' && sessionExpiresAt.value && new Date() < sessionExpiresAt.value) {
                console.warn('Mode développement : validation serveur échouée mais token client valide, session maintenue')
                return true
            }

            // En production, ne pas forcer la déconnexion immédiatement sur erreur réseau
            // Retourner false mais laisser le composant gérer la déconnexion
            console.warn('Session validation failed, but not forcing logout immediately')
            return false
        }
    }

    // Authentification sécurisée
    const authenticate = async (authData: { eventId: string; authToken: string }): Promise<AuthResponse> => {
        try {
            console.log('Authentification sécurisée avec:', authData)

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
                isAuthenticated.value = true                // Activer le scanning
                isScanning.value = true

                // Sauvegarder en localStorage pour la persistance
                if (import.meta.client) {
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
    // Scan QR Code sécurisé
    const scanQRCode = async (qrData: string) => {
        console.log('Scan QR sécurisé:', qrData)

        if (!currentEvent.value?.id || !currentScanner.value?.id) {
            console.error('Événement ou scanner non configuré')
            return
        }        // Vérifier la validité de la session avant le scan 
        // En dev : seulement après 5 minutes depuis la dernière vérification ET après avoir au moins fait une vérification
        // En prod : vérifier à chaque scan mais pas forcer la déconnexion
        const now = Date.now()
        const isFirstCheckInDev = process.env.NODE_ENV === 'development' && lastSessionValidationCheck.value === 0
        const shouldCheckSession = process.env.NODE_ENV !== 'development' || (!isFirstCheckInDev && (now - lastSessionValidationCheck.value > 5 * 60 * 1000))

        if (sessionToken.value && shouldCheckSession) {
            try {
                const isValid = await checkSessionValidity()
                if (!isValid) {
                    console.warn('Session validation failed during scan - session expired')
                    scanResult.value = {
                        valid: false,
                        reason: 'Session expired. Please log in again.'
                    }

                    // Invalider l'authentification pour forcer la reconnexion
                    isAuthenticated.value = false
                    return
                }
            } catch (error) {
                // En mode développement, ignorer les erreurs de validation de session si le token n'est pas expiré côté client
                if (process.env.NODE_ENV === 'development' && sessionExpiresAt.value && new Date() < sessionExpiresAt.value) {
                    console.warn('Mode développement : erreur de validation de session ignorée, token client valide')
                } else {
                    console.warn('Session validation error during scan - network or server issue')
                    scanResult.value = {
                        valid: false,
                        reason: 'Unable to verify session. Please check connection and try again.'
                    }
                    return
                }
            }
        }

        // Mettre à jour le timestamp de la dernière vérification
        if (shouldCheckSession) {
            lastSessionValidationCheck.value = now
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
            }        } catch (error: any) {
            console.error('Erreur scan QR:', error)
            
            // Gestion spécifique des erreurs HTTP
            if (error.statusCode === 401) {
                scanResult.value = {
                    valid: false,
                    reason: 'Session expired. Please log in again.'
                }
                // Forcer la déconnexion sur 401
                isAuthenticated.value = false
            } else if (error.statusCode === 403) {
                scanResult.value = {
                    valid: false,
                    reason: 'Access denied for this event.'
                }
            } else if (error.statusCode === 429) {
                scanResult.value = {
                    valid: false,
                    reason: 'Too many scan attempts. Please wait and try again.'
                }
            } else {
                scanResult.value = {
                    valid: false,
                    reason: error.message || 'Unknown scan error'
                }
            }
        }

        // Sauvegarder les stats
        saveToLocalStorage()
    }

    // Mise à jour des statistiques
    const updateStats = (result: ScanResult) => {
        scannerStats.totalScanned++
        if (result.valid) {
            scannerStats.validScans++
        } else {
            scannerStats.invalidScans++
        }
    }

    // Sauvegarde localStorage
    const saveToLocalStorage = () => {
        if (!import.meta.client) return

        try {
            localStorage.setItem('scanner_stats', JSON.stringify(scannerStats))
            localStorage.setItem('offline_queue', JSON.stringify(offlineQueue.value))
        } catch (error) {
            console.error('Error saving to localStorage:', error)
        }
    }    // Restaurer la session depuis localStorage
    const restoreSession = async () => {
        if (!import.meta.client) return

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
                    isScanning.value = true  // Réactiver le scanning après restauration

                    console.log('Session restaurée depuis localStorage:', {
                        scanner: currentScanner.value?.name,
                        event: currentEvent.value?.name,
                        expires: sessionExpiresAt.value
                    })

                    // Synchroniser immédiatement avec le serveur pour s'assurer que la session est valide
                    // Cela évite l'erreur 401 au premier scan après refresh
                    const isValid = await checkSessionValidity()
                    if (!isValid) {
                        console.warn('Session restaurée mais invalide côté serveur, nettoyage...')
                        localStorage.removeItem('scanner_session')
                        isAuthenticated.value = false
                        isScanning.value = false
                    } else {
                        console.log('Session restaurée et validée côté serveur avec succès')
                    }
                } else {
                    // Session expirée, nettoyer
                    localStorage.removeItem('scanner_session')
                }
            }

            // Restaurer les stats
            const savedStats = localStorage.getItem('scanner_stats')
            if (savedStats) {
                const stats = JSON.parse(savedStats)
                Object.assign(scannerStats, stats)
            }

            // Restaurer la queue offline
            const savedQueue = localStorage.getItem('offline_queue')
            if (savedQueue) {
                offlineQueue.value = JSON.parse(savedQueue)
            }
        } catch (error) {
            console.error('Error restoring session:', error)
            localStorage.removeItem('scanner_session')
        }
    }

    // Listeners pour la connexion
    const handleOnline = () => {
        isOnline.value = true
        // Vérifier la session quand on revient en ligne
        if (sessionToken.value) {
            checkSessionValidity()
        }
    }

    const handleOffline = () => {
        isOnline.value = false
    }

    // Computed properties
    const sessionInfo = computed(() => ({
        isValid: isAuthenticated.value && sessionToken.value !== null,
        expiresAt: sessionExpiresAt.value,
        timeRemaining: sessionExpiresAt.value ?
            Math.max(0, sessionExpiresAt.value.getTime() - Date.now()) : 0
    }))

    const hasOfflineQueue = computed(() => offlineQueue.value.length > 0)    // Lifecycle
    onMounted(async () => {
        if (import.meta.client) {
            window.addEventListener('online', handleOnline)
            window.addEventListener('offline', handleOffline)
            await restoreSession()
        }
    })

    onUnmounted(() => {
        if (import.meta.client) {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    })

    return {
        // État
        isAuthenticated: readonly(isAuthenticated),
        currentEvent: readonly(currentEvent),
        currentScanner: readonly(currentScanner),
        isOnline: readonly(isOnline),
        isSyncing: readonly(isSyncing),
        isScanning: readonly(isScanning),
        scanResult: readonly(scanResult),
        sessionInfo,
        scannerStats: readonly(scannerStats),
        hasOfflineQueue,        // Actions
        authenticate,
        logout,
        scanQRCode,
        checkSessionValidity,
        restoreSession
    }
}
