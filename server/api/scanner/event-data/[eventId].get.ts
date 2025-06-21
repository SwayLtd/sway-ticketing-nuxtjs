import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, getRouterParam, createError } from 'h3'

export default defineEventHandler(async (event) => {
    const eventId = getRouterParam(event, 'eventId')

    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // Récupérer tous les tickets valides pour l'événement
        const { data: tickets, error: ticketsError } = await supabase
            .from('tickets')
            .select(`
        id, 
        qr_code_data, 
        status, 
        scanned_at, 
        scanned_by, 
        customization_data,
        products:product_id (
          name,
          type
        )
      `)
            .eq('event_id', eventId)
            .in('status', ['valid', 'scanned'])

        if (ticketsError) {
            throw createError({
                statusCode: 400,
                statusMessage: `Erreur récupération tickets: ${ticketsError.message}`
            })
        }

        // Récupérer les informations de l'événement
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select('id, title, hmac_token, date_time')
            .eq('id', eventId)
            .single()

        if (eventError) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Événement non trouvé'
            })
        }

        // Récupérer les statistiques de scan
        const { data: scanStats, error: statsError } = await supabase
            .from('tickets')
            .select('status')
            .eq('event_id', eventId)

        const stats = {
            total: scanStats?.length || 0,
            scanned: scanStats?.filter(t => t.status === 'scanned').length || 0,
            valid: scanStats?.filter(t => t.status === 'valid').length || 0
        }

        return {
            event: eventData,
            tickets: tickets || [],
            stats,
            downloadedAt: new Date().toISOString(),
            // Ne pas inclure la clé HMAC complète dans la réponse par sécurité
            hmacHash: eventData.hmac_token ? 'present' : 'missing'
        }

    } catch (error) {
        console.error('Erreur récupération données événement:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur interne du serveur'
        })
    }
})
