// Storage partagé des sessions actives (en production, utiliser Redis)
export const activeSessions = new Map<string, {
    scanner_id: string
    event_id: number
    created_at: number
    last_activity: number
}>()

// Nettoyage automatique des sessions expirées
setInterval(() => {
    const now = Date.now()
    const maxAge = 8 * 60 * 60 * 1000 // 8 heures

    for (const [key, session] of activeSessions.entries()) {
        if (now - session.created_at > maxAge) {
            activeSessions.delete(key)
        }
    }
}, 60 * 60 * 1000) // Nettoyage toutes les heures
