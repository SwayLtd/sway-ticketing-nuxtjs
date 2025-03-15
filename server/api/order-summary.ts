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

    // Récupérer la commande depuis la table "orders" à partir du provider_order_id
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('provider_order_id', provider_order_id)
        .single()

    if (orderError || !order) {
        throw createError({ statusCode: 404, statusMessage: 'Order not found' })
    }

    // Récupérer les produits de la commande en joignant avec la table "products"
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

    // Construire le tableau des articles
    const items = orderProducts.map((op: any) => {
        const product = op.products
        return {
            id: op.id,
            name: product?.name || 'Produit inconnu',
            quantity: op.quantity,
            price: op.price, // en euros
            type: product?.type || null,
        }
    })

    // Calculer le total global : utiliser order.total si présent, sinon faire la somme des articles
    let total = order.total
    if (total == null) {
        total = items.reduce((sum: number, item: any) => sum + item.quantity * item.price, 0)
    }

    // Calculer le total des tickets uniquement
    const ticketTotal = items
        .filter(item => item.type === 'ticket')
        .reduce((sum: number, item: any) => sum + item.quantity * item.price, 0)

    // Calcul des frais sur les tickets : 3,5 % du total + 0,50 €
    const ticketFees = Number((ticketTotal * 0.035 + 0.5).toFixed(2))

    // Vérifier si l'un des articles correspond à un ticket (type === 'ticket')
    const hasTickets = items.some(item => item.type === 'ticket')

    return {
        items,
        total,
        hasTickets,
        ticketFees
    }
})
