import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, getQuery, createError } from 'h3'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

export default defineEventHandler(async (event) => {
    const { order_id, token } = getQuery(event)

    if (!order_id || !token) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing order_id or token parameters'
        })
    }

    try {
        // Récupérer les tickets avec le service role key (bypass RLS)
        const { data: tickets, error } = await supabase
            .from('tickets')
            .select(`
                *,
                products (
                    name
                )
            `)
            .eq('order_id', order_id)
            .eq('customization_token', token)

        if (error) {
            console.error('Error fetching tickets:', error)
            throw createError({
                statusCode: 500,
                statusMessage: 'Error fetching tickets'
            })
        }

        if (!tickets || tickets.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: 'No tickets found or invalid token'
            })
        }

        return {
            success: true,
            tickets
        }

    } catch (error: any) {
        console.error('API Error:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal server error'
        })
    }
})
