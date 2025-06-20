import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { activeSessions } from '~/server/utils/sessionStore'

// Rate limiting storage (en production, utiliser Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, maxAttempts?: number, windowMs = 15 * 60 * 1000): boolean {
    // Ajuster les limites selon l'environnement
    if (!maxAttempts) {
        maxAttempts = process.env.NODE_ENV === 'development' ? 100 : 10
    }
    const now = Date.now()
    const record = rateLimitStore.get(identifier)

    if (!record || now > record.resetTime) {
        rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs })
        return true
    }

    if (record.count >= maxAttempts) {
        return false
    }

    record.count++
    return true
}

// Fonction pour logger les événements de sécurité
async function logSecurityEvent(supabase: any, eventType: string, payload: any) {
    try {
        await supabase
            .from('logs')
            .insert({
                event_type: eventType,
                payload: payload,
                occurred_at: new Date().toISOString()
            })
    } catch (error) {
        console.error('Failed to log security event:', error)
    }
}

// Génération d'un token de session simple (remplace JWT pour éviter la dépendance)
function generateSessionToken(payload: any): string {
    const data = JSON.stringify(payload)
    const timestamp = Date.now()
    
    if (!process.env.JWT_SECRET) {
        console.error('❌ CRITICAL: JWT_SECRET environment variable is not defined!')
        throw new Error('JWT_SECRET environment variable is required')
    }
    
    const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET)
        .update(data + timestamp)
        .digest('hex')

    return Buffer.from(JSON.stringify({
        data: payload,
        timestamp,
        signature,
        expires: timestamp + (8 * 60 * 60 * 1000) // 8 heures
    })).toString('base64')
}

export default defineEventHandler(async (event) => {
    // Vérification de la méthode
    if (getMethod(event) !== 'POST') {
        throw createError({
            statusCode: 405,
            statusMessage: 'Method not allowed'
        })
    }

    const body = await readBody(event)
    const { eventId, authToken, userId } = body

    // Validation des paramètres
    if (!eventId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Event ID is required'
        })
    }

    if (!authToken && !userId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Authentication token or user ID is required'
        })
    }

    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Rate limiting par IP
    const clientIP = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
    if (!checkRateLimit(`auth_${clientIP}`)) {
        await logSecurityEvent(supabase, 'scanner_auth_rate_limited', {
            ip: clientIP,
            event_id: eventId,
            timestamp: new Date().toISOString()
        })

        throw createError({
            statusCode: 429,
            statusMessage: 'Too many authentication attempts'
        })
    }

    try {
        // Rate limiting par scanner_id si fourni via authToken
        if (authToken) {
            if (!checkRateLimit(`scanner_token_${authToken.substring(0, 16)}`)) {
                await logSecurityEvent(supabase, 'scanner_auth_rate_limited', {
                    ip: clientIP,
                    event_id: eventId,
                    reason: 'token_rate_limit',
                    timestamp: new Date().toISOString()
                })

                throw createError({
                    statusCode: 429,
                    statusMessage: 'Too many attempts for this scanner'
                })
            }
        }

        let query = supabase
            .from('scanners')
            .select(`
        *,
        events:event_id (
          id,
          title,
          description,
          hmac_token,
          date_time
        ),
        users:user_id (
          id,
          username,
          email
        )
      `).eq('event_id', eventId)
            .eq('status', 'active')

        // Authentification par token ou par utilisateur
        if (authToken) {
            // Vérification sécurisée du token avec hash
            const { data: scanners, error: queryError } = await supabase
                .from('scanners')
                .select('*')
                .eq('event_id', eventId)
                .eq('status', 'active')

            if (queryError || !scanners) {
                await logSecurityEvent(supabase, 'scanner_auth_failed', {
                    reason: 'query_error',
                    error: queryError?.message,
                    ip: clientIP,
                    timestamp: new Date().toISOString()
                })

                throw createError({
                    statusCode: 401,
                    statusMessage: 'Scanner non autorisé pour cet événement'
                })
            }

            // Vérification du token avec comparaison sécurisée
            let matchingScanner = null

            for (const scanner of scanners) {
                // Test 1: Comparaison directe (tokens en clair)
                if (authToken === scanner.auth_token) {
                    matchingScanner = scanner
                    break
                }

                // Test 2: Comparaison avec hash
                const tokenHash = crypto.createHash('sha256').update(authToken).digest('hex')
                const expectedTokenHash = crypto.createHash('sha256').update(scanner.auth_token).digest('hex')

                if (tokenHash === expectedTokenHash) {
                    matchingScanner = scanner
                    break
                }
            }

            if (!matchingScanner) {
                await logSecurityEvent(supabase, 'scanner_auth_failed', {
                    reason: 'invalid_token',
                    ip: clientIP,
                    event_id: eventId,
                    timestamp: new Date().toISOString()
                })

                throw createError({
                    statusCode: 401,
                    statusMessage: 'Scanner non autorisé pour cet événement'
                })
            }

            // Récupérer les données complètes du scanner
            const { data: scanner, error } = await supabase
                .from('scanners')
                .select('*')
                .eq('id', matchingScanner.id)
                .single()

            if (error || !scanner) {
                throw createError({
                    statusCode: 401,
                    statusMessage: 'Scanner non autorisé pour cet événement'
                })
            }

            // Récupérer l'événement séparément
            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single()

            // Vérifier que l'événement existe et est actif
            if (eventError || !event) {
                throw createError({
                    statusCode: 404,
                    statusMessage: 'Événement non trouvé'
                })
            }

            // Génération du token de session
            const sessionToken = generateSessionToken({
                scanner_id: scanner.id,
                scanner_name: scanner.name,
                event_id: eventId,
                user_id: scanner.user_id,
                scanner_token: scanner.auth_token,
                type: 'scanner_session'
            })

            const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

            // Enregistrer la session active
            const sessionKey = `${scanner.id}_${eventId}`
            activeSessions.set(sessionKey, {
                scanner_id: scanner.id,
                event_id: parseInt(eventId),
                created_at: Date.now(),
                last_activity: Date.now()
            })

            // Log de succès d'authentification
            await logSecurityEvent(supabase, 'scanner_auth_success', {
                scanner_id: scanner.id,
                scanner_name: scanner.name,
                event_id: eventId,
                ip: clientIP,
                timestamp: new Date().toISOString(),
                expires_at: expiresAt
            })

            // Mise à jour de la dernière activité du scanner
            await supabase
                .from('scanners')
                .update({
                    updated_at: new Date().toISOString()
                })
                .eq('id', scanner.id)            // Retourner les informations sécurisées
            return {
                success: true,
                session_token: sessionToken,
                expires_at: expiresAt,
                scanner: {
                    id: scanner.id,
                    name: scanner.name,
                    event_id: scanner.event_id,
                    user_id: scanner.user_id,
                    is_active: scanner.status === 'active',
                    created_at: scanner.created_at || new Date().toISOString()
                },
                event: {
                    id: event.id,
                    name: event.title,
                    description: event.description || '',
                    start_date: event.date_time,
                    end_date: event.date_time
                },
                hmacKey: event.hmac_token
            }

        } else if (userId) {
            query = query.eq('user_id', userId)
        }

        // Logique existante pour userId (simplifiée, sans token de session pour plus de sécurité)
        if (userId && !authToken) {
            const { data: scanner, error } = await query.single()

            if (error || !scanner) {
                await logSecurityEvent(supabase, 'scanner_auth_failed', {
                    reason: 'user_scanner_not_found',
                    user_id: userId,
                    event_id: eventId,
                    ip: clientIP,
                    timestamp: new Date().toISOString()
                })

                throw createError({
                    statusCode: 401,
                    statusMessage: 'Scanner non autorisé pour cet événement'
                })
            }

            // Vérifier que l'événement existe et est actif
            if (!scanner.events) {
                throw createError({
                    statusCode: 404,
                    statusMessage: 'Événement non trouvé'
                })
            }

            // Log de succès (moins sécurisé, sans session token)
            await logSecurityEvent(supabase, 'scanner_user_auth_success', {
                scanner_id: scanner.id,
                user_id: userId,
                event_id: eventId,
                ip: clientIP,
                timestamp: new Date().toISOString()
            })

            // Retourner les informations du scanner et de l'événement
            return {
                success: true,
                scanner: {
                    id: scanner.id,
                    name: scanner.name,
                    event_id: scanner.event_id,
                    user_id: scanner.user_id,
                    is_active: scanner.status === 'active',
                    created_at: scanner.created_at || new Date().toISOString()
                },
                event: {
                    id: scanner.events.id,
                    name: scanner.events.title,
                    description: scanner.events.description || '',
                    start_date: scanner.events.date_time,
                    end_date: scanner.events.date_time
                },
                hmacKey: scanner.events.hmac_token
            }
        }

    } catch (error: any) {
        // Log des erreurs système
        await logSecurityEvent(supabase, 'scanner_auth_error', {
            error: error.message || 'Unknown error',
            ip: clientIP,
            event_id: eventId,
            timestamp: new Date().toISOString()
        })

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur interne du serveur'
        })
    }
})
