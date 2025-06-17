import { serverSupabaseServiceRole } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
    try {
        const { scannerId } = await readBody(event)

        // Validation des paramètres
        if (!scannerId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Scanner ID requis'
            })
        }    // Initialiser Supabase avec les permissions service role
        const config = useRuntimeConfig()
        const supabase = createClient(
            config.public.SUPABASE_URL,
            config.SUPABASE_SERVICE_ROLE_KEY
        )

        // Supprimer le scanner
        const { error } = await supabase
            .from('scanners')
            .delete()
            .eq('id', scannerId)

        if (error) {
            console.error('Erreur suppression scanner:', error)
            throw createError({
                statusCode: 500,
                statusMessage: 'Erreur lors de la suppression du scanner'
            })
        }

        return {
            success: true,
            message: 'Scanner supprimé avec succès'
        }
    } catch (error: any) {
        console.error('Erreur dans delete.delete.ts:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur serveur lors de la suppression'
        })
    }
})
