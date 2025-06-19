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

// Function to verify and decode the session token
function verifySessionToken(token: string): any {
    try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString())

        // Check expiration
        if (Date.now() > decoded.expires) {
            throw new Error('Token expired')
        }

        if (!process.env.JWT_SECRET) {
            console.error('❌ CRITICAL: JWT_SECRET environment variable is not defined!')
            throw new Error('JWT_SECRET environment variable is required')
        }

        // Check signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.JWT_SECRET)
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

// Function to log security events
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
    // Method check
    if (getMethod(event) !== 'POST') {
        throw createError({
            statusCode: 405,
            statusMessage: 'Method not allowed'
        })
    }

    const body = await readBody(event)
    const { qrData, eventId, scannerId, sessionToken } = body

    // Required parameter validation
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

    // Aggressive rate limiting for QR validations
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

        // Authentication check (session token or legacy scannerId)
        if (sessionToken) {
            try {
                const sessionData = verifySessionToken(sessionToken)

                // Check that the session matches the event
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
            // Legacy mode for compatibility (less secure)
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
        }        // Use the secure RPC function to validate the QR code
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
                statusMessage: `Validation error: ${validationError.message}`
            })
        }        // If the ticket is valid, mark it as scanned
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
                    statusMessage: `Error marking ticket as scanned: ${scanError.message}`
                })
            }

            // Check the scan result
            if (!scanResult?.success) {
                console.log('DEBUG: Scan failed, reason:', scanResult?.reason)
                // The ticket cannot be scanned (already scanned, invalid status, etc.)
                const reason = scanResult?.reason || 'unknown'

                if (reason === 'already_scanned') {
                    // Retrieve full scanner info who performed the scan
                    const { data: scannerData } = await supabase
                        .from('scanners')
                        .select('id, name')
                        .eq('id', scanResult.scanned_by)
                        .single()

                    return {
                        valid: false,
                        ticket: validationResult.ticket || { id: 'unknown' },
                        message: 'Ticket already scanned',
                        errorCode: 'ALREADY_SCANNED',
                        scanned_at: scanResult.scanned_at,
                        scanned_by: scannerData || { name: 'Unknown scanner' }
                    }
                } else {
                    return {
                        valid: false,
                        ticket: validationResult.ticket,
                        message: `Unable to scan ticket: ${reason}`,
                        errorCode: 'SCAN_FAILED',
                        reason: reason
                    }
                }
            }

            // Successful update - use data returned by mark_ticket_scanned
            validationResult.ticket = {
                ...validationResult.ticket,
                ...scanResult.ticket
            }
        }        // Log scan activity
        await logSecurityEvent(supabase, 'qr_scan_attempt', {
            scanner_id: authenticatedScanner.id,
            event_id: eventId,
            result: validationResult.valid ? 'success' : 'failed',
            reason: validationResult.reason,
            ip: clientIP,
            timestamp: new Date().toISOString()
        })

        // If the ticket is valid, it was automatically marked as scanned by mark_ticket_scanned
        if (validationResult.valid) {
            // Log success
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
                message: 'Ticket successfully validated and scanned',
                scannedBy: {
                    id: authenticatedScanner.id,
                    name: authenticatedScanner.name
                }
            }
        }        // Handle other invalid cases
        if (!validationResult.valid) {
            switch (validationResult.reason) {
                case 'already_scanned':
                    // Retrieve full scanner info who performed the scan
                    const { data: scannerData } = await supabase
                        .from('scanners')
                        .select('id, name')
                        .eq('id', validationResult.scanned_by)
                        .single()

                    return {
                        valid: false,
                        message: 'Ticket already scanned',
                        errorCode: 'ALREADY_SCANNED',
                        scanned_at: validationResult.scanned_at,
                        scanned_by: scannerData || { name: 'Unknown scanner' }
                    }
                case 'event_not_found':
                    return {
                        valid: false,
                        message: 'Event not found',
                        errorCode: 'EVENT_NOT_FOUND',
                        reason: 'event_not_found'
                    }
                case 'ticket_not_found_or_invalid_hmac':
                    return {
                        valid: false,
                        message: 'Invalid or counterfeit QR code',
                        errorCode: 'INVALID_QR',
                        reason: 'ticket_not_found_or_invalid_hmac'
                    }
                default:
                    return {
                        valid: false,
                        message: validationResult.reason || 'Invalid ticket',
                        errorCode: 'UNKNOWN',
                        reason: validationResult.reason
                    }
            }
        }

        // Return default validation result
        return validationResult

    } catch (error: any) {
        // Log system errors
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
            statusMessage: 'Internal server error'
        })
    }
})
