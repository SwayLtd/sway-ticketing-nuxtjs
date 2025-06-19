import { defineEventHandler, readBody, createError } from 'h3';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { generateStylizedTicketPDF } from '../utils/ticket-pdf';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { ticket_id } = body;

    // Use Netlify Image CDN URL for logo
    const logoUrl = `${process.env.BASE_URL || 'https://test.sway.events'}/images/black_logotype.jpg`;
    console.log('Using logo URL:', logoUrl); if (!ticket_id) {
      throw createError({ statusCode: 400, statusMessage: 'ticket_id is required' });
    } console.log('Debug - Looking for ticket_id:', ticket_id);

    // First, let's check if the ticket exists at all
    const { data: simpleTicket, error: simpleError } = await supabase
      .from('tickets')
      .select('id, event_id, customization_data, qr_code_data, order_id, product_id')
      .eq('id', ticket_id)
      .single();

    console.log('Debug - Simple ticket query:', { simpleTicket, simpleError });

    if (simpleError || !simpleTicket) {
      console.error('Debug - Simple ticket query failed:', simpleError);
      throw createError({ statusCode: 404, statusMessage: 'Ticket not found' });
    }    // Now get the full ticket with relations
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
      .single(); console.log('Debug - Full ticket response:', { ticket, ticketError });

    let finalTicket: any;
    let eventInfo: any;

    if (ticketError || !ticket) {
      console.error('Debug - Full ticket query failed:', ticketError);
      // Use the simple ticket data as fallback and get additional data separately      console.log('Debug - Using simple ticket as fallback');

      // Get product info separately
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, price, currency')
        .eq('id', simpleTicket.product_id)
        .single();

      console.log('Debug - Product query:', { product, productError });      // Get event info separately
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          title, 
          image_url, 
          date_time, 
          metadata,
          event_venue(
            venues(name, location)
          )
        `)
        .eq('id', simpleTicket.event_id)
        .single();

      console.log('Debug - Event query:', { event, eventError });

      if (eventError) {
        console.error('Debug - Event query failed, trying without venue relation');
        // Try without venue relation if it fails
        const { data: simpleEvent, error: simpleEventError } = await supabase
          .from('events')
          .select('title, image_url, date_time, metadata')
          .eq('id', simpleTicket.event_id)
          .single();

        console.log('Debug - Simple event query:', { simpleEvent, simpleEventError });

        if (simpleEvent) {
          eventInfo = simpleEvent;
        }
      } else {
        eventInfo = event;
      }

      // Reconstruct ticket object
      finalTicket = {
        ...simpleTicket,
        products: product,
        events: eventInfo
      };

      console.log('Debug - Reconstructed ticket:', finalTicket);
    } else {
      // Use the original ticket
      finalTicket = ticket;
      eventInfo = (ticket as any).events;
    } console.log('Debug - event info from ticket:', eventInfo);
    console.log('Debug - ticket event_id:', finalTicket.event_id);

    // Emergency fallback if eventInfo is still null
    if (!eventInfo && finalTicket.event_id) {
      console.log('Debug - Emergency fallback: getting basic event info');
      const { data: basicEvent } = await supabase
        .from('events')
        .select('title, image_url, date_time')
        .eq('id', finalTicket.event_id)
        .single();

      if (basicEvent) {
        eventInfo = basicEvent;
        console.log('Debug - Emergency event info:', eventInfo);
      }
    }

    const customization = finalTicket.customization_data;
    if (!customization || !customization.email) {
      throw createError({ statusCode: 400, statusMessage: 'Ticket customization data incomplete' });
    }

    // Create subject line with event name if available
    const productName = (finalTicket.products as any)?.name || 'Standard Ticket';
    const eventName = eventInfo?.title || 'the event';
    console.log('Debug - Event name for subject:', eventName);
    const subjectLine = `Your Personalized Ticket for ${eventName}`;

    // Generate PDF buffer
    const pdfBuffer = await generateStylizedTicketPDF(finalTicket, eventInfo);

    // Compose stylized email content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Personalized Ticket</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #FFBC00 0%, #E6A600 100%); color: #333; padding: 30px 40px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #333;">Your Personalized Ticket is Ready!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.8; color: #444;">Your ticket for ${eventName} has been personalized and is ready to use.</p>
          </div>          ${eventInfo && eventInfo.image_url ? `
          <!-- Event Image -->
          <div style="text-align: center; padding: 20px; background-color: #f8f9fa;">
            <img src="${eventInfo.image_url}" alt="${eventInfo.title}" style="width: 320px; height: 180px; object-fit: cover; border-radius: 8px; border: 3px solid #FFBC00; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
          </div>
          ` : ''}

          <!-- Content -->
          <div style="padding: 40px;">
            
            <!-- Personal Greeting -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="margin: 0 0 15px 0; font-size: 24px; color: #333; font-weight: 600;">Dear ${customization.firstName} ${customization.lastName},</h2>
              <p style="margin: 0; font-size: 16px; color: #666; line-height: 1.5;">
                Thank you for personalizing your ticket! Your personalized ticket is attached to this email as a PDF.
              </p>
            </div>

            <!-- Ticket Info -->
            <div style="background-color: #fff9e6; border: 2px solid #FFBC00; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: 600; text-align: center;">Ticket Details</h3>
              <table style="width: 100%;">
                <tr>
                  <td style="font-size: 14px; color: #666; padding: 8px 0; font-weight: 500;">Event:</td>
                  <td style="font-size: 14px; color: #333; padding: 8px 0; text-align: right; font-weight: 600;">${eventName}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666; padding: 8px 0; font-weight: 500;">Ticket Type:</td>
                  <td style="font-size: 14px; color: #333; padding: 8px 0; text-align: right; font-weight: 600;">${(finalTicket.products as any)?.name || 'Standard Ticket'}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666; padding: 8px 0; font-weight: 500;">Name:</td>
                  <td style="font-size: 14px; color: #333; padding: 8px 0; text-align: right; font-weight: 600;">${customization.firstName} ${customization.lastName}</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #666; padding: 8px 0; font-weight: 500;">Email:</td>
                  <td style="font-size: 14px; color: #333; padding: 8px 0; text-align: right; font-weight: 600;">${customization.email}</td>
                </tr>
              </table>
            </div>

            <!-- Important Instructions -->
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333; font-weight: 600;">📱 Important Instructions</h3>
              <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 14px; line-height: 1.6;">
                <li>Download and save the attached PDF ticket to your phone</li>
                <li>Show the QR code at the entrance for quick check-in</li>
                <li>Keep this email as your booking confirmation</li>
                <li>Arrive early to avoid queues at the entrance</li>
              </ul>
            </div>            <!-- Footer Message -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">
                We're excited to see you at the event! If you have any questions, please <a href="mailto:${process.env.SMTP_FROM || 'no-reply@sway.events'}" style="color: #FFBC00; text-decoration: none; font-weight: 500;">contact our support team</a>.
              </p>
            </div>
          </div>          <!-- Footer with Logo -->
          <div style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #eee;">
            <!-- Logo -->
            <div style="margin-bottom: 15px;">
              <img src="${logoUrl}" alt="Sway Logo" style="height: 25px; width: auto;" />
            </div>
            <p style="margin: 0; font-size: 12px; color: #999;">Ticket ID: ${finalTicket.id}</p>
          </div>
        </div>
      </body>
      </html>
    `; await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: customization.email,
      subject: subjectLine,
      html: htmlContent,
      attachments: [
        {
          filename: `ticket_${finalTicket.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }
        // Logo now loaded via URL in HTML, no need for attachment
      ],
    });

    return { success: true, message: 'Personalization email with PDF sent' };
  } catch (error: any) {
    console.error('Error sending personalization email:', error);
    throw createError({ statusCode: error.statusCode || 500, statusMessage: error.message || 'Internal Server Error' });
  }
});
