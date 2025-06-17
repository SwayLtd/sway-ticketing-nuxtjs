import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { name, eventId, userId, type } = body

    const config = useRuntimeConfig()
    const supabase = createClient(
        config.public.SUPABASE_URL,
        config.SUPABASE_SERVICE_ROLE_KEY
    )

    try {
        // TODO: Vérifier les permissions utilisateur pour l'événement
        // Note: Pour l'instant, on permet la création sans vérification d'auth
        // Dans un environnement de production, il faudrait vérifier les permissions

        // Générer un token d'authentification unique
        const authToken = generateUniqueToken()

        const scannerData: any = {
            name,
            event_id: eventId,
            auth_token: authToken,
            status: 'active'
        }        // Ajouter user_id si c'est un scanner utilisateur
        if (type === 'user' && userId) {
            scannerData.user_id = userId
        }

        const { data: scanner, error: insertError } = await supabase
            .from('scanners')
            .insert(scannerData)
            .select()
            .single()

        if (insertError) {
            throw createError({
                statusCode: 400,
                statusMessage: `Erreur création scanner: ${insertError.message}`
            })
        } return {
            success: true,
            scanner,
            scannerUrl: `${config.public.BASE_URL || 'http://localhost:3000'}/scanner?event_id=${eventId}&auth_token=${authToken}`
        }

    } catch (error: any) {
        console.error('Erreur création scanner:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur interne du serveur'
        })
    }
})

function generateUniqueToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}
