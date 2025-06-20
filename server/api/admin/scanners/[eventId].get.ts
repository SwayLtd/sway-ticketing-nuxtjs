import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
    const eventId = getRouterParam(event, 'eventId')

    const config = useRuntimeConfig()
    const supabase = createClient(
        config.public.SUPABASE_URL,
        config.SUPABASE_SERVICE_ROLE_KEY
    )

    try {
        // Récupérer tous les scanners pour l'événement
        const { data: scanners, error } = await supabase
            .from('scanners')
            .select(`
        *,
        users:user_id (
          id,
          username,
          email
        )
      `)
            .eq('event_id', eventId)
            .order('created_at', { ascending: false })

        if (error) {
            throw createError({
                statusCode: 400,
                statusMessage: `Erreur récupération scanners: ${error.message}`
            })
        }

        return {
            success: true,
            scanners: scanners || []
        }

    } catch (error: any) {
        console.error('Erreur récupération scanners:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur interne du serveur'
        })
    }
})
