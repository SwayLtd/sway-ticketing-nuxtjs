export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { scannedTickets, scannerId } = body

    try {
        // Appeler l'Edge Function pour synchroniser les tickets
        const response = await $fetch('/functions/v1/sync-scanned-tickets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scannedTickets,
                scannerId
            })
        })

        return response
    } catch (error: any) {
        console.error('Erreur synchronisation offline:', error)

        throw createError({
            statusCode: 500,
            statusMessage: `Erreur synchronisation: ${error.message}`
        })
    }
})
