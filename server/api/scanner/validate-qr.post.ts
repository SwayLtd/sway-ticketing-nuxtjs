import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, maxAttempts = 30, windowMs = 60 * 1000): boolean {
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

// Fonction pour vérifier et décoder le token de session
function verifySessionToken(token: string): any {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString())

        // Vérifier l'expiration
        if (Date.now() > decoded.expires) {
            throw new Error('Token expired')
        }

        // Vérifier la signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.JWT_SECRET || 'fallback-secret')
            .update(JSON.stringify(decoded.data) + decoded.timestamp)
            .digest('hex')

        if (expectedSignature !== decoded.signature) {
            throw new Error('Invalid signature')
        }

        return decoded.data
    } catch (error) {
        throw new Error('Invalid token')
    }
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

export default defineEventHandler(async (event) => {
    // Vérification de la méthode
    if (getMethod(event) !== 'POST') {
        throw createError({
            statusCode: 405,
            statusMessage: 'Method not allowed'
        })
    }

    const body = await readBody(event)
    const { qrData, eventId, scannerId, sessionToken } = body

    // Validation des paramètres requis
    if (!qrData || !eventId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'QR data and event ID are required'
        })
    }

    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const clientIP = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'

    // Rate limiting agressif pour les validations QR
    if (!checkRateLimit(`qr_validate_${clientIP}`, 30, 60 * 1000)) {
        await logSecurityEvent(supabase, 'qr_validate_rate_limited', {
            ip: clientIP,
            event_id: eventId,
            timestamp: new Date().toISOString()
        })

        throw createError({
            statusCode: 429,
            statusMessage: 'Too many validation requests'
        })
    }

    try {
        let authenticatedScanner = null

        // Vérification de l'authentification (session token ou scannerId legacy)
        if (sessionToken) {
            try {
                const sessionData = verifySessionToken(sessionToken)

                // Vérifier que la session correspond à l'événement
                if (sessionData.event_id !== eventId) {
                    await logSecurityEvent(supabase, 'qr_validate_auth_failed', {
                        reason: 'event_mismatch',
                        session_event_id: sessionData.event_id,
                        requested_event_id: eventId,
                        ip: clientIP,
                        timestamp: new Date().toISOString()
                    })

                    throw createError({
                        statusCode: 403,
                        statusMessage: 'Session not authorized for this event'
                    })
                }

                authenticatedScanner = {
                    id: sessionData.scanner_id,
                    name: sessionData.scanner_name,
                    auth_token: sessionData.scanner_token
                }
            } catch (tokenError: any) {
                await logSecurityEvent(supabase, 'qr_validate_auth_failed', {
                    reason: 'invalid_session_token',
                    error: tokenError.message || 'Unknown token error',
                    ip: clientIP,
                    timestamp: new Date().toISOString()
                })

                throw createError({
                    statusCode: 401,
                    statusMessage: 'Invalid or expired session token'
                })
            }
        } else if (scannerId) {
            // Mode legacy pour compatibilité (moins sécurisé)
            const { data: scanner, error: scannerError } = await supabase
                .from('scanners')
                .select('*')
                .eq('id', scannerId)
                .eq('event_id', eventId)
                .eq('status', 'active')
                .single()

            if (scannerError || !scanner) {
                await logSecurityEvent(supabase, 'qr_validate_auth_failed', {
                    reason: 'scanner_not_found',
                    scanner_id: scannerId,
                    event_id: eventId,
                    ip: clientIP,
                    timestamp: new Date().toISOString()
                })

                throw createError({
                    statusCode: 401,
                    statusMessage: 'Scanner not authorized'
                })
            }

            authenticatedScanner = scanner
        } else {
            throw createError({
                statusCode: 401,
                statusMessage: 'Authentication required (session token or scanner ID)'
            })
        }        // Utiliser la fonction RPC sécurisée pour valider le QR code
        const { data: validationResult, error: validationError } = await supabase
            .rpc('validate_qr_code', {
                qr_data: qrData,
                event_id_param: eventId
            })

        if (validationError) {
            await logSecurityEvent(supabase, 'qr_validate_error', {
                error: validationError.message,
                event_id: eventId,
                scanner_id: authenticatedScanner.id,
                ip: clientIP,
                timestamp: new Date().toISOString()
            })

            throw createError({
                statusCode: 400,
                statusMessage: `Erreur de validation: ${validationError.message}`
            })
        }        // Si le ticket est valide, le marquer comme scanné
        console.log('DEBUG: validationResult:', JSON.stringify(validationResult, null, 2))
        console.log('DEBUG: check condition:', validationResult?.valid, validationResult?.ticket?.id)

        if (validationResult?.valid && validationResult?.ticket?.id) {
            console.log('DEBUG: Calling mark_ticket_scanned with:', validationResult.ticket.id, authenticatedScanner.id)

            const { data: scanResult, error: scanError } = await supabase
                .rpc('mark_ticket_scanned', {
                    ticket_id_param: validationResult.ticket.id,
                    scanner_id_param: authenticatedScanner.id
                })

            console.log('DEBUG: scanResult:', JSON.stringify(scanResult, null, 2))
            console.log('DEBUG: scanError:', scanError)

            if (scanError) {
                await logSecurityEvent(supabase, 'ticket_scan_error', {
                    error: scanError.message,
                    ticket_id: validationResult.ticket.id,
                    scanner_id: authenticatedScanner.id,
                    event_id: eventId,
                    ip: clientIP,
                    timestamp: new Date().toISOString()
                })

                throw createError({
                    statusCode: 500,
                    statusMessage: `Erreur lors du marquage du ticket: ${scanError.message}`
                })
            }

            // Vérifier le résultat du scan
            if (!scanResult?.success) {
                console.log('DEBUG: Scan failed, reason:', scanResult?.reason)
                // Le ticket ne peut pas être scanné (déjà scanné, statut invalide, etc.)
                const reason = scanResult?.reason || 'unknown'

                if (reason === 'already_scanned') {
                    // Récupérer les informations complètes du scanner qui a effectué le scan
                    const { data: scannerData } = await supabase
                        .from('scanners')
                        .select('id, name')
                        .eq('id', scanResult.scanned_by)
                        .single()

                    return {
                        valid: false,
                        ticket: validationResult.ticket || { id: 'unknown' },
                        message: 'Ticket déjà scanné',
                        errorCode: 'ALREADY_SCANNED',
                        scanned_at: scanResult.scanned_at,
                        scanned_by: scannerData || { name: 'Scanner inconnu' }
                    }
                } else {
                    return {
                        valid: false,
                        ticket: validationResult.ticket,
                        message: `Impossible de scanner le ticket: ${reason}`,
                        errorCode: 'SCAN_FAILED',
                        reason: reason
                    }
                }
            }

            // Mise à jour réussie - utiliser les données retournées par mark_ticket_scanned
            validationResult.ticket = {
                ...validationResult.ticket,
                ...scanResult.ticket
            }
        }        // Log de l'activité de scan
        await logSecurityEvent(supabase, 'qr_scan_attempt', {
            scanner_id: authenticatedScanner.id,
            event_id: eventId,
            result: validationResult.valid ? 'success' : 'failed',
            reason: validationResult.reason,
            ip: clientIP,
            timestamp: new Date().toISOString()
        })

        // Si le ticket est valide, il a été automatiquement marqué comme scanné par mark_ticket_scanned
        if (validationResult.valid) {
            // Log de succès
            await logSecurityEvent(supabase, 'ticket_scanned_success', {
                ticket_id: validationResult.ticket.id,
                scanner_id: authenticatedScanner.id,
                event_id: eventId,
                ip: clientIP,
                timestamp: new Date().toISOString()
            })

            return {
                valid: true,
                ticket: validationResult.ticket,
                message: 'Ticket validé et scanné avec succès',
                scannedBy: {
                    id: authenticatedScanner.id,
                    name: authenticatedScanner.name
                }
            }
        }        // Gérer les autres cas d'invalidité
        if (!validationResult.valid) {
            switch (validationResult.reason) {
                case 'already_scanned':
                    // Récupérer les informations complètes du scanner qui a effectué le scan
                    const { data: scannerData } = await supabase
                        .from('scanners')
                        .select('id, name')
                        .eq('id', validationResult.scanned_by)
                        .single()

                    return {
                        valid: false,
                        message: 'Ticket déjà scanné',
                        errorCode: 'ALREADY_SCANNED',
                        scanned_at: validationResult.scanned_at,
                        scanned_by: scannerData || { name: 'Scanner inconnu' }
                    }
                case 'event_not_found':
                    return {
                        valid: false,
                        message: 'Événement non trouvé',
                        errorCode: 'EVENT_NOT_FOUND',
                        reason: 'event_not_found'
                    }
                case 'ticket_not_found_or_invalid_hmac':
                    return {
                        valid: false,
                        message: 'QR code invalide ou contrefait',
                        errorCode: 'INVALID_QR',
                        reason: 'ticket_not_found_or_invalid_hmac'
                    }
                default:
                    return {
                        valid: false,
                        message: validationResult.reason || 'Ticket invalide',
                        errorCode: 'UNKNOWN',
                        reason: validationResult.reason
                    }
            }
        }

        // Retourner le résultat de validation par défaut
        return validationResult

    } catch (error: any) {
        // Log des erreurs système
        await logSecurityEvent(supabase, 'qr_validate_system_error', {
            error: error.message || 'Unknown error',
            event_id: eventId,
            ip: clientIP,
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
