import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, readBody, createError } from 'h3'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { ticket_id, order_id, token, customization_data } = body

    if (!ticket_id || !order_id || !token || !customization_data) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing required parameters'
        })
    }

    // Valider que le ticket existe et que le token correspond
    const { data: existingTicket, error: checkError } = await supabase
        .from('tickets')
        .select('id, order_id, customization_token')
        .eq('id', ticket_id)
        .eq('order_id', order_id)
        .eq('customization_token', token)
        .single()

    if (checkError || !existingTicket) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Ticket not found or invalid token'
        })
    }

    try {
        // Mettre à jour les données de personnalisation
        const { data, error } = await supabase
            .from('tickets')
            .update({ customization_data })
            .eq('id', ticket_id)
            .select()
            .single()

        if (error) {
            console.error('Error updating ticket:', error)
            throw createError({
                statusCode: 500,
                statusMessage: 'Error updating ticket customization'
            })
        }

        return {
            success: true,
            ticket: data
        }

    } catch (error: any) {
        console.error('API Error:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal server error'
        })
    }
})
