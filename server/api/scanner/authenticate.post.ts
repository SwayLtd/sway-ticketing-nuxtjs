import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { eventId, authToken, userId } = body

    console.log('Authentification scanner - Paramètres reçus:', {
        eventId,
        authToken: authToken ? `${authToken.substring(0, 8)}...` : undefined,
        userId
    })

    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
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
            query = query.eq('auth_token', authToken)
        } else if (userId) {
            query = query.eq('user_id', userId)
        } else {
            throw createError({
                statusCode: 400,
                statusMessage: 'Token d\'authentification ou ID utilisateur requis'
            })
        }

        const { data: scanner, error } = await query.single()

        console.log('Requête Supabase - Résultat:', {
            data: scanner ? {
                id: scanner.id,
                name: scanner.name,
                event_id: scanner.event_id,
                status: scanner.status,
                auth_token: scanner.auth_token ? `${scanner.auth_token.substring(0, 8)}...` : undefined
            } : null,
            error: error ? {
                message: error.message,
                code: error.code,
                details: error.details
            } : null
        })

        if (error || !scanner) {
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
        }        // Retourner les informations du scanner et de l'événement
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
    } catch (error) {
        console.error('Erreur authentification scanner:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur interne du serveur'
        })
    }
})
