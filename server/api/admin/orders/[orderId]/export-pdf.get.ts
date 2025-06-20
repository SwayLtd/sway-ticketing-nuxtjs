import { defineEventHandler, getRouterParam, setHeader } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { generateOrderReceiptPDF } from '~/server/utils/order-pdf'

export default defineEventHandler(async (event) => {
    try {
        const supabase = serverSupabaseServiceRole(event)
        const orderId = getRouterParam(event, 'orderId')

        if (!orderId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Order ID is required'
            })
        }

        // Get order details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Order not found'
            })
        }

        // Get order products with product details
        const { data: orderProducts, error: productsError } = await supabase
            .from('order_products')
            .select(`
        *,
        products (
          id,
          name,
          description,
          type,
          currency
        )
      `)
            .eq('order_id', orderId)

        if (productsError) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Failed to fetch order products'
            })
        }

        // Get event information
        const { data: eventInfo, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', order.entity_id)
            .single()

        if (eventError) {
            console.warn('Could not fetch event info:', eventError)
        }

        // Generate PDF
        const pdfBuffer = await generateOrderReceiptPDF(order, orderProducts || [], eventInfo)

        // Set response headers for PDF download
        setHeader(event, 'Content-Type', 'application/pdf')
        setHeader(event, 'Content-Disposition', `attachment; filename="recu-commande-${order.id.slice(0, 8)}.pdf"`)
        setHeader(event, 'Content-Length', pdfBuffer.length.toString())

        return pdfBuffer

    } catch (error: any) {
        console.error('PDF export error:', error)

        if (error.statusCode) {
            throw error
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to generate PDF receipt'
        })
    }
})
