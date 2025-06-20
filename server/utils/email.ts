import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function sendOrderSummaryEmail(to: string | null, orderId: string, customizationLink: string, products: any[], entityType?: string, entityId?: number) {
  if (!to) {
    throw new Error('Recipient email address missing');
  }

  // Use Netlify Image CDN URL for logo
  const logoUrl = `${process.env.BASE_URL || 'https://test.sway.events'}/images/black_logotype.jpg`;
  console.log('Using logo URL:', logoUrl);// Retrieve event information if this is an event-related order
  let eventInfo = null;
  if (entityType === 'event' && entityId) {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('title, image_url')
        .eq('id', entityId)
        .single(); if (!eventError && eventData) {
          eventInfo = eventData;
          console.log('Event information retrieved:', eventInfo);
        } else {
        console.warn('Unable to retrieve event information:', eventError);
      }
    } catch (error) {
      console.error('Error retrieving event information:', error);
    }
  }
  // Retrieve order products with full product details and calculate totals
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
    .eq('order_id', orderId);

  if (opError || !orderProducts) {
    console.error('Erreur lors de la récupération des produits de commande:', opError);
    throw new Error('Failed to retrieve order products');
  }

  console.log('Produits de commande récupérés:', orderProducts.length);

  // Build items with product names
  const items = orderProducts.map((op: any) => ({
    id: op.id,
    name: op.products?.name || 'Unknown Product',
    quantity: op.quantity,
    price: op.price,
    type: op.products?.type || null,
  }));

  // Calculate totals like in order-summary.ts
  const productsTotal = items.reduce((sum: number, item: any) => sum + item.quantity * item.price, 0);

  const ticketTotal = items
    .filter(item => item.type === 'ticket')
    .reduce((sum: number, item: any) => sum + item.quantity * item.price, 0);

  const ticketFees = Number((ticketTotal * 0.035 + 0.5).toFixed(2));
  const grandTotal = Number((productsTotal + ticketFees).toFixed(2));

  const hasTickets = items.some(item => item.type === 'ticket');

  // Generate product list HTML with prices
  const productListHtml = items.map(item => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px 0; font-size: 14px; color: #333;">${item.name}</td>
      <td style="padding: 12px 0; text-align: center; font-size: 14px; color: #666;">${item.quantity}</td>
      <td style="padding: 12px 0; text-align: right; font-size: 14px; color: #333;">€${item.price.toFixed(2)}</td>
      <td style="padding: 12px 0; text-align: right; font-size: 14px; font-weight: 600; color: #333;">€${(item.quantity * item.price).toFixed(2)}</td>
    </tr>
  `).join('');  // Create subject line with event name if available
  const subjectLine = eventInfo ? `Thank you for your order for ${eventInfo.title}!` : 'Thank you for your order!';

  console.log('Preparing email with subject:', subjectLine);
  console.log('Recipient:', to);
  console.log('Number of items:', items.length);
  console.log('Grand total:', grandTotal);

  // Create stylized HTML email content
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f7f7;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #FFBC00 0%, #E6A600 100%); color: #333; padding: 30px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #333;">Thank you for your order!</h1>
          ${eventInfo ? `<p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.8; color: #444;">Your tickets for ${eventInfo.title} have been confirmed.</p>` : '<p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.8; color: #444;">Your order has been confirmed and is being processed.</p>'}
        </div>        ${eventInfo && eventInfo.image_url ? `
        <!-- Event Image -->
        <div style="text-align: center; padding: 20px; background-color: #f8f9fa;">
          <img src="${eventInfo.image_url}" alt="${eventInfo.title}" style="width: 320px; height: 180px; object-fit: cover; border-radius: 8px; border: 3px solid #FFBC00; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
        </div>
        ` : ''}

        <!-- Content -->
        <div style="padding: 40px;">
          
          <!-- Order Summary -->
          <div style="margin-bottom: 30px;">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #333; font-weight: 600;">Order Summary</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 12px 0; text-align: left; font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
                  <th style="padding: 12px 0; text-align: center; font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                  <th style="padding: 12px 0; text-align: right; font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                  <th style="padding: 12px 0; text-align: right; font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${productListHtml}
              </tbody>
            </table>            <!-- Totals -->
            <div style="border-top: 2px solid #eee; padding-top: 20px;">
              <table style="width: 100%;">
                <tr>
                  <td style="font-size: 14px; color: #666; padding: 4px 0;">Subtotal:</td>
                  <td style="font-size: 14px; color: #333; font-weight: 500; text-align: right; padding: 4px 0;">€${productsTotal.toFixed(2)}</td>
                </tr>
                ${hasTickets ? `
                <tr>
                  <td style="font-size: 14px; color: #666; padding: 4px 0;">Service fees:</td>
                  <td style="font-size: 14px; color: #333; font-weight: 500; text-align: right; padding: 4px 0;">€${ticketFees.toFixed(2)}</td>
                </tr>
                ` : ''}                <tr style="border-top: 1px solid #eee;">
                  <td style="font-size: 16px; color: #333; font-weight: 600; padding: 12px 0 4px 0;">Total:</td>
                  <td style="font-size: 18px; color: #FFBC00; font-weight: 700; text-align: right; padding: 12px 0 4px 0;">€${grandTotal.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>          ${hasTickets ? `
          <!-- Customization Section -->
          <div style="background-color: #fff9e6; border: 2px solid #FFBC00; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 30px;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: 600;">Customize Your Tickets</h3>
            <p style="margin: 0 0 25px 0; font-size: 14px; color: #666; line-height: 1.5;">Personalize your tickets with your name and details to complete your order.</p>
            
            <a href="${customizationLink}" style="display: inline-block; background: linear-gradient(135deg, #FFBC00 0%, #E6A600 100%); color: #333; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 2px 6px rgba(255, 188, 0, 0.3);">
              Customize My Tickets
            </a>
          </div>
          ` : ''}          <!-- Footer Message -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">
              Thank you for choosing us! If you have any questions, please don't hesitate to <a href="mailto:${process.env.SMTP_FROM || 'no-reply@sway.events'}" style="color: #FFBC00; text-decoration: none; font-weight: 500;">contact our support team</a>.
            </p>
          </div>
        </div>        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; border-top: 1px solid #eee;">
          <img src="${logoUrl}" alt="Sway" style="width: 80px; height: 25px; margin-bottom: 15px; object-fit: contain;" />
          <p style="margin: 0; font-size: 12px; color: #999;">Order ID: ${orderId}</p>
        </div>
      </div>
    </body>
    </html>
  `;  // Send email
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject: subjectLine,
      html: htmlContent,
      attachments: [] // No more file attachments needed
    };

    console.log('Sending order summary email...');
    const result = await transporter.sendMail(mailOptions);
    console.log('Order summary email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending order summary email:', error);
    throw error;
  }
}
