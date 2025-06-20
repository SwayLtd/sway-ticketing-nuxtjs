import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { scannedTickets, scannerId } = await req.json()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log(`Processing ${scannedTickets.length} offline scanned tickets for scanner ${scannerId}`)

        // Traitement en batch des tickets scannés
        const results = []
        for (const ticket of scannedTickets) {
            try {
                // Utiliser la fonction RPC pour marquer le ticket comme scanné
                const { data, error } = await supabase
                    .rpc('mark_ticket_scanned', {
                        ticket_id_param: ticket.ticketId,
                        scanner_id_param: scannerId
                    })

                if (error) {
                    console.error(`Error processing ticket ${ticket.ticketId}:`, error)
                    results.push({
                        ticket_id: ticket.ticketId,
                        success: false,
                        error: error.message
                    })
                } else {
                    console.log(`Successfully processed ticket ${ticket.ticketId}`)
                    results.push({
                        ticket_id: ticket.ticketId,
                        success: data.success,
                        data: data
                    })
                }
            } catch (ticketError) {
                console.error(`Exception processing ticket ${ticket.ticketId}:`, ticketError)
                results.push({
                    ticket_id: ticket.ticketId,
                    success: false,
                    error: ticketError.message
                })
            }
        }

        const successCount = results.filter(r => r.success).length
        const failureCount = results.length - successCount

        console.log(`Sync completed: ${successCount} success, ${failureCount} failures`)

        return new Response(
            JSON.stringify({
                results,
                summary: {
                    total: results.length,
                    success: successCount,
                    failures: failureCount
                }
            }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            }
        )
    } catch (error) {
        console.error('Error in sync-scanned-tickets function:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json'
                }
            }
        )
    }
})
