import { serverSupabaseServiceRole } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
    try {
        const { scannerId, status } = await readBody(event)

        // Validation des paramètres
        if (!scannerId || !status) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Scanner ID et status requis'
            })
        }

        if (!['active', 'inactive'].includes(status)) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Status doit être "active" ou "inactive"'
            })
        }    // Initialiser Supabase avec les permissions service role
        const config = useRuntimeConfig()
        const supabase = createClient(
            config.public.SUPABASE_URL,
            config.SUPABASE_SERVICE_ROLE_KEY
        )

        // Mettre à jour le statut du scanner
        const { data, error } = await supabase
            .from('scanners')
            .update({ status })
            .eq('id', scannerId)
            .select()
            .single()

        if (error) {
            console.error('Erreur mise à jour scanner:', error)
            throw createError({
                statusCode: 500,
                statusMessage: 'Erreur lors de la mise à jour du scanner'
            })
        }

        return {
            success: true,
            scanner: data,
            message: `Scanner ${status === 'active' ? 'activé' : 'désactivé'} avec succès`
        }
    } catch (error: any) {
        console.error('Erreur dans status.put.ts:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Erreur serveur lors de la mise à jour du statut'
        })
    }
})
