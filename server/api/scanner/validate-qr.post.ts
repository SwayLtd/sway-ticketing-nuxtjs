import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { qrData, eventId, scannerId } = body

    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Récupérer la clé HMAC de l'événement
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('hmac_token')
            .eq('id', eventId)
            .single()

        if (eventError || !eventData) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Événement non trouvé'
            })
        }

        // Utiliser la fonction RPC pour valider le QR code
        const { data: validationResult, error: validationError } = await supabase
            .rpc('validate_qr_code', {
                qr_data: qrData,
                event_id_param: eventId,
                hmac_key: eventData.hmac_token
            })

        if (validationError) {
            throw createError({
                statusCode: 400,
                statusMessage: `Erreur de validation: ${validationError.message}`
            })
        }

        // Vérifier si le ticket a déjà été scanné
        if (!validationResult.valid && validationResult.reason === 'already_scanned') {
            // Récupérer les informations complètes du scanner qui a effectué le scan
            const { data: scannerData } = await supabase
                .from('scanners')
                .select('id, name')
                .eq('id', validationResult.scanned_by)
                .single()

            return {
                valid: false,
                ticket: validationResult.ticket || { id: 'unknown' },
                message: 'Ticket déjà scanné',
                errorCode: 'ALREADY_SCANNED',
                scannedAt: validationResult.scanned_at,
                scannedBy: scannerData || { name: 'Scanner inconnu' }
            }
        }        // Si le ticket est valide, le marquer comme scanné
        if (validationResult.valid) {
            const { data: scanResult, error: scanError } = await supabase
                .rpc('mark_ticket_scanned', {
                    ticket_id_param: validationResult.ticket.id,
                    scanner_id_param: scannerId
                })

            if (scanError) {
                throw createError({
                    statusCode: 400,
                    statusMessage: `Erreur lors du scan: ${scanError.message}`
                })
            }

            return {
                valid: true,
                ticket: {
                    ...validationResult.ticket,
                    scanned_at: scanResult.ticket.scanned_at,
                    scanned_by: scanResult.ticket.scanned_by
                },
                message: 'Ticket validé et scanné avec succès'
            }        }

        // Gérer les autres cas d'invalidité
        if (!validationResult.valid) {
            switch (validationResult.reason) {
                case 'ticket_not_found':
                    return {
                        valid: false,
                        message: 'Ticket non trouvé',
                        errorCode: 'NOT_FOUND',
                        reason: 'ticket_not_found'
                    }
                case 'invalid_status':
                    return {
                        valid: false,
                        message: `Ticket invalide (statut: ${validationResult.status})`,
                        errorCode: 'INVALID_STATUS',
                        reason: 'invalid_status',
                        status: validationResult.status
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

        // Retourner le résultat de validation (non valide) - ne devrait pas arriver
        return validationResult
    } catch (error: any) {
        console.error('Erreur validation QR:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur interne du serveur'
        })
    }
})
