import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { activeSessions } from '~/server/utils/sessionStore'

// Fonction pour vérifier et décoder le token de session
function verifySessionToken(token: string): any {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString())

        // Vérifier l'expiration
        if (Date.now() > decoded.expires) {
            throw new Error('Token expired')
        }

        // Vérifier la signature - utiliser le même format que pour la génération
        const dataString = JSON.stringify(decoded.data)
        const expectedSignature = crypto
            .createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
            .update(dataString + decoded.timestamp)
            .digest('hex')

        if (expectedSignature !== decoded.signature) {
            console.error('Signature mismatch:', {
                expected: expectedSignature,
                received: decoded.signature,
                dataString,
                timestamp: decoded.timestamp
            })
            throw new Error('Invalid signature')
        }

        return decoded.data
    } catch (error: any) {
        console.error('Token verification failed:', error)
        throw new Error('Invalid token')
    }
}

export default defineEventHandler(async (event) => {
    const method = getMethod(event)

    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // GET: Vérifier le statut d'une session
    if (method === 'GET') {
        const query = getQuery(event)
        const { session_token } = query as { session_token: string }

        if (!session_token) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Session token required'
            })
        } try {
            const sessionData = verifySessionToken(session_token)

            // Vérifier si la session est active
            const sessionKey = `${sessionData.scanner_id}_${sessionData.event_id}`
            const activeSession = activeSessions.get(sessionKey)            // En développement, être plus permissif si la session n'est pas trouvée
            // (le serveur peut avoir redémarré et perdu les sessions en mémoire)
            if (!activeSession) {
                if (process.env.NODE_ENV === 'development') {
                    // En dev, on recrée automatiquement la session à partir du token valide
                    const newSession = {
                        scanner_id: sessionData.scanner_id,
                        event_id: sessionData.event_id,
                        created_at: Date.now(),
                        last_activity: Date.now()
                    }
                    activeSessions.set(sessionKey, newSession)
                } else {
                    // En production, vérifier que le scanner existe toujours en base avant de recréer la session
                    const { data: scanner, error } = await supabase
                        .from('scanners')
                        .select('id, status')
                        .eq('id', sessionData.scanner_id)
                        .eq('event_id', sessionData.event_id)
                        .eq('status', 'active')
                        .single()

                    if (error || !scanner) {
                        throw createError({
                            statusCode: 401,
                            statusMessage: 'Scanner no longer active'
                        })
                    }

                    throw createError({
                        statusCode: 401,
                        statusMessage: 'Session not found or expired'
                    })
                }
            }

            // Mettre à jour la dernière activité
            const currentSession = activeSessions.get(sessionKey)!
            currentSession.last_activity = Date.now()
            activeSessions.set(sessionKey, currentSession)

            return {
                valid: true,
                scanner_id: sessionData.scanner_id,
                event_id: sessionData.event_id,
                expires_at: new Date(sessionData.timestamp + (8 * 60 * 60 * 1000)).toISOString()
            }

        } catch (error) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid or expired session token'
            })
        }
    }

    // POST: Créer une nouvelle session (réauthentification)
    if (method === 'POST') {
        const body = await readBody(event)
        const { scanner_id, auth_token, event_id } = body

        if (!scanner_id || !auth_token || !event_id) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Missing required parameters'
            })
        }

        // Vérifier le scanner
        const { data: scanner, error: scannerError } = await supabase
            .from('scanners')
            .select('*')
            .eq('id', scanner_id)
            .eq('event_id', event_id)
            .eq('status', 'active')
            .single()

        if (scannerError || !scanner) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid scanner credentials'
            })
        }

        // Vérifier le token d'authentification
        const tokenHash = crypto.createHash('sha256').update(auth_token).digest('hex')
        const expectedTokenHash = crypto.createHash('sha256').update(scanner.auth_token).digest('hex')

        if (tokenHash !== expectedTokenHash) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid scanner credentials'
            })
        }

        // Créer une nouvelle session
        const sessionKey = `${scanner_id}_${event_id}`
        const sessionInfo = {
            scanner_id,
            event_id,
            created_at: Date.now(),
            last_activity: Date.now()
        }

        activeSessions.set(sessionKey, sessionInfo)

        return {
            success: true,
            message: 'Session renewed successfully'
        }
    }

    // DELETE: Révoquer une session
    if (method === 'DELETE') {
        const body = await readBody(event)
        const { session_token } = body

        if (!session_token) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Session token required'
            })
        }

        try {
            const sessionData = verifySessionToken(session_token)
            const sessionKey = `${sessionData.scanner_id}_${sessionData.event_id}`

            // Supprimer la session
            activeSessions.delete(sessionKey)

            // Logger la révocation
            await supabase
                .from('logs')
                .insert({
                    event_type: 'scanner_session_revoked',
                    payload: {
                        scanner_id: sessionData.scanner_id,
                        event_id: sessionData.event_id,
                        timestamp: new Date().toISOString()
                    }
                })

            return {
                success: true,
                message: 'Session revoked successfully'
            }

        } catch (error) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid session token'
            })
        }
    }

    throw createError({
        statusCode: 405,
        statusMessage: 'Method not allowed'
    })
})

// Nettoyage automatique des sessions expirées (toutes les 10 minutes)
setInterval(() => {
    const now = Date.now()
    const maxAge = 8 * 60 * 60 * 1000 // 8 heures

    for (const [key, session] of activeSessions.entries()) {
        if (now - session.created_at > maxAge || now - session.last_activity > 30 * 60 * 1000) {
            activeSessions.delete(key)
        }
    }
}, 10 * 60 * 1000)
