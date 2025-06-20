import { createClient } from '@supabase/supabase-js'
import { defineEventHandler, getQuery, createError } from 'h3'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

export default defineEventHandler(async (event) => {
    const { provider_order_id } = getQuery(event)
    if (!provider_order_id || typeof provider_order_id !== 'string') {
        throw createError({ statusCode: 400, statusMessage: 'Missing or invalid provider_order_id' })
    }

    // Retrieve order from "orders" table using provider_order_id
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('provider_order_id', provider_order_id)
        .single()

    if (orderError || !order) {
        throw createError({ statusCode: 404, statusMessage: 'Order not found' })
    }

    // Retrieve products for the order, joining with the "products" table
    const { data: orderProducts, error: opError } = await supabase
        .from('order_products')
        .select(`
            id,
            quantity,
            price,
            products (
                name,
                type
            )
        `)
        .eq('order_id', order.id)

    if (opError) {
        throw createError({ statusCode: 500, statusMessage: 'Error fetching order products' })
    }

    // Build the items array
    const items = orderProducts.map((op: any) => {
        const product = op.products
        return {
            id: op.id,
            name: product?.name || 'Produit inconnu',
            quantity: op.quantity,
            price: op.price, // in euros
            type: product?.type || null,
        }
    })    // Compute the total for products only (excluding fees)
    const productsTotal = items.reduce((sum: number, item: any) => sum + item.quantity * item.price, 0)

    // Compute the total for tickets only
    const ticketTotal = items
        .filter(item => item.type === 'ticket')
        .reduce((sum: number, item: any) => sum + item.quantity * item.price, 0)

    // Compute ticket fees: 3.5% of ticket total + 0.50€
    const ticketFees = Number((ticketTotal * 0.035 + 0.5).toFixed(2))

    // The total should be products total only (fees are calculated separately)
    const total = productsTotal

    // Determine if there are any tickets in the order
    const hasTickets = items.some(item => item.type === 'ticket')    // Retrieve the customization token from tickets.
    let customization_token = null
    if (hasTickets) {
        const { data: tokenData, error: tokenError } = await supabase
            .from('tickets')
            .select('customization_token')
            .eq('order_id', order.id)
            .not('customization_token', 'is', null) // Ensure token is not null
            .limit(1)
            .single()
        if (!tokenError && tokenData && tokenData.customization_token) {
            customization_token = tokenData.customization_token
        }
    } return {
        items,
        total,
        grandTotal: Number((total + ticketFees).toFixed(2)),
        hasTickets,
        ticketFees,
        order_id: order.id,
        customization_token
    }
})
