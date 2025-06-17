// Service Worker pour Sway Ticketing Scanner
const CACHE_NAME = 'sway-scanner-v1'
const STATIC_CACHE_NAME = 'sway-scanner-static-v1'

// Ressources à mettre en cache
const STATIC_ASSETS = [
    '/',
    '/scanner',
    '/manifest.json',
    '/favicon.ico',
    // Ajouter les assets CSS/JS de Nuxt ici si nécessaire
]

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...')

    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => {
            console.log('Service Worker: Caching static assets')
            return cache.addAll(STATIC_ASSETS)
        })
    )

    // Forcer l'activation immédiate
    self.skipWaiting()
})

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...')

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Supprimer les anciens caches
                    if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName)
                        return caches.delete(cacheName)
                    }
                })
            )
        })
    )

    // Prendre le contrôle immédiatement
    self.clients.claim()
})

// Interception des requêtes
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Stratégie pour les pages
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Mettre en cache la réponse pour un accès offline
                    const responseClone = response.clone()
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone)
                    })
                    return response
                })
                .catch(() => {
                    // Servir depuis le cache si offline
                    return caches.match(request).then((cachedResponse) => {
                        return cachedResponse || caches.match('/scanner')
                    })
                })
        )
        return
    }

    // Stratégie pour les API calls
    if (url.pathname.startsWith('/api/scanner/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Sauvegarder les réponses GET en cache
                    if (request.method === 'GET' && response.ok) {
                        const responseClone = response.clone()
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone)
                        })
                    }
                    return response
                })
                .catch((error) => {
                    console.log('API request failed, trying cache:', request.url)

                    // Pour les requêtes GET, essayer le cache
                    if (request.method === 'GET') {
                        return caches.match(request).then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse
                            }

                            // Retourner une réponse d'erreur offline
                            return new Response(
                                JSON.stringify({
                                    error: 'offline',
                                    message: 'Application hors ligne'
                                }),
                                {
                                    status: 503,
                                    statusText: 'Service Unavailable',
                                    headers: { 'Content-Type': 'application/json' }
                                }
                            )
                        })
                    }

                    // Pour les requêtes POST (scans), on laisse l'app gérer
                    throw error
                })
        )
        return
    }

    // Stratégie pour les assets statiques
    if (request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font' ||
        request.destination === 'image') {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse
                }

                return fetch(request).then((response) => {
                    // Mettre en cache les assets
                    if (response.ok) {
                        const responseClone = response.clone()
                        caches.open(STATIC_CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone)
                        })
                    }
                    return response
                })
            })
        )
        return
    }

    // Stratégie par défaut : network first
    event.respondWith(
        fetch(request).catch(() => {
            return caches.match(request)
        })
    )
})

// Gestion des messages depuis l'app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting()
    }

    if (event.data && event.data.type === 'CACHE_EVENT_DATA') {
        // Mettre en cache les données d'événement
        const { eventId, data } = event.data.payload
        caches.open(CACHE_NAME).then((cache) => {
            const request = new Request(`/api/scanner/event-data/${eventId}`)
            const response = new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' }
            })
            cache.put(request, response)
        })
    }
})

// Synchronisation en arrière-plan (si supportée)
if ('sync' in self.registration) {
    self.addEventListener('sync', (event) => {
        if (event.tag === 'sync-scanned-tickets') {
            event.waitUntil(
                // Notifier l'app qu'une sync est requise
                self.clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: 'BACKGROUND_SYNC_REQUESTED',
                            tag: event.tag
                        })
                    })
                })
            )
        }
    })
}

// Notifications Push (pour les mises à jour futures)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json()

        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'sway-scanner',
                requireInteraction: false
            })
        )
    }
})

// Gestion des clics sur notifications
self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    event.waitUntil(
        self.clients.matchAll().then((clients) => {
            // Ouvrir ou focus sur l'app
            if (clients.length > 0) {
                return clients[0].focus()
            } else {
                return self.clients.openWindow('/scanner')
            }
        })
    )
})
