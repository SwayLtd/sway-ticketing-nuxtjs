import { defineEventHandler, readBody, createError, setHeader } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { generateStylizedTicketPDF } from '../utils/ticket-pdf';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { ticket_id } = body;

        if (!ticket_id) {
            throw createError({ statusCode: 400, statusMessage: 'ticket_id is required' });
        }    // Retrieve ticket with all necessary information including venue
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .select(`
        id, 
        customization_data, 
        qr_code_data, 
        order_id,
        event_id,
        products(name, price, currency),
        events(
          title, 
          image_url, 
          date_time, 
          metadata,
          event_venue(
            venues(name, location)
          )
        )
      `)
            .eq('id', ticket_id)
            .single();

        if (ticketError || !ticket) {
            throw createError({ statusCode: 404, statusMessage: 'Ticket not found' });
        }

        // Get event information
        const eventInfo = (ticket as any).events;

        // Generate PDF buffer
        const pdfBuffer = await generateStylizedTicketPDF(ticket, eventInfo);

        // Set headers for PDF download
        setHeader(event, 'Content-Type', 'application/pdf');
        setHeader(event, 'Content-Disposition', `attachment; filename=ticket_${ticket.id}.pdf`);

        return pdfBuffer;
    } catch (error: any) {
        console.error('Error generating ticket PDF:', error);
        throw createError({ statusCode: error.statusCode || 500, statusMessage: error.message || 'Internal Server Error' });
    }
});
