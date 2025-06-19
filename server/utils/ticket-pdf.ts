import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';

export async function generateStylizedTicketPDF(ticket: any, eventInfo: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({ margin: 0 });
        const buffers: Uint8Array[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 20;

        // Sway colors
        const swayYellow = '#FFBC00';
        const darkGray = '#333333';
        const lightGray = '#666666';        // 1. Event image at the top (full width, 16:9 aspect ratio)
        const imageHeight = pageWidth * (9 / 16); // Calculate height for 16:9 aspect ratio - full size

        if (eventInfo && eventInfo.image_url) {
            try {
                // Try to fetch and display the actual event image
                const response = await fetch(eventInfo.image_url);
                if (response.ok) {
                    const imageBuffer = Buffer.from(await response.arrayBuffer());
                    // Use cover to fill the entire space while maintaining aspect ratio
                    doc.image(imageBuffer, 0, 0, {
                        width: pageWidth,
                        height: imageHeight,
                        fit: [pageWidth, imageHeight],
                        align: 'center',
                        valign: 'center'
                    });
                } else {
                    throw new Error('Failed to fetch image');
                }
            } catch (err) {
                console.log('Could not load event image, using placeholder:', err);
                // Fallback to yellow background with text
                doc.rect(0, 0, pageWidth, imageHeight)
                    .fill(swayYellow);

                doc.fontSize(20)
                    .fill(darkGray)
                    .font('Helvetica-Bold')
                    .text(eventInfo?.title || 'Event', 0, imageHeight / 2 - 10, { align: 'center', width: pageWidth });
            }
        } else {
            // Yellow header if no image URL
            doc.rect(0, 0, pageWidth, imageHeight)
                .fill(swayYellow);

            doc.fontSize(20)
                .fill(darkGray)
                .font('Helvetica-Bold')
                .text(eventInfo?.title || 'Event', 0, imageHeight / 2 - 10, { align: 'center', width: pageWidth });
        }        // 2. Main content container with border (optimized height)
        const containerY = imageHeight + 20;
        const containerHeight = 340; // Reduced height to stop after CLIENT NAME/ORDER NUMBER// Container background and border with rounded corners
        doc.roundedRect(margin, containerY, pageWidth - 2 * margin, containerHeight, 12)
            .fillAndStroke('white', swayYellow)
            .lineWidth(3); const contentX = margin + 30;
        const contentY = containerY + 30;
        let currentY = contentY;        // Calculate dimensions for QR code section and right sections
        const qrSize = 120;
        const qrSectionWidth = qrSize + 60; // QR code + padding
        const qrSectionHeight = 165; // Height to match EVENT (45) + gap (15) + TICKET TYPE (45) + gap (15) + DATE & TIME (45)
        const rightSectionX = contentX + qrSectionWidth + 20; // Right sections start after QR + gap
        const rightSectionWidth = pageWidth - 2 * contentX - qrSectionWidth - 20; // Remaining width

        // QR Code section - positioned at left
        doc.roundedRect(contentX, currentY, qrSectionWidth, qrSectionHeight, 8)
            .fillAndStroke('white', swayYellow)
            .lineWidth(2);

        // Center the title "SCAN FOR ENTRY"
        doc.fontSize(12)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text('SCAN FOR ENTRY', contentX, currentY + 8, {
                width: qrSectionWidth,
                align: 'center'
            });

        try {
            const qrDataUrl = await QRCode.toDataURL(ticket.qr_code_data || '', {
                errorCorrectionLevel: 'M',
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');

            // Center QR code in the section
            const qrX = contentX + (qrSectionWidth - qrSize) / 2;
            const qrY = currentY + 25;
            doc.image(Buffer.from(base64Data, 'base64'), qrX, qrY, {
                fit: [qrSize, qrSize]
            });
        } catch (err) {
            console.error('Error generating QR code image:', err);
            doc.fontSize(10)
                .fill(lightGray)
                .text(`QR Code Data: ${ticket.qr_code_data || ''}`, contentX + 10, currentY + 50);
        }        // EVENT section - positioned at right top
        doc.roundedRect(rightSectionX, currentY, rightSectionWidth, 45, 5)
            .fillAndStroke('#F8F9FA', '#E0E0E0')
            .lineWidth(1);

        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('EVENT', rightSectionX + 10, currentY + 8);

        doc.fontSize(16)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text(eventInfo?.title || 'Event Name', rightSectionX + 10, currentY + 25);

        // DATE & TIME section - positioned at right, below EVENT
        const dateTimeY = currentY + 60;
        let dateTimeText = 'TBD';
        if (eventInfo?.date_time) {
            try {
                const eventDate = new Date(eventInfo.date_time);
                const options: Intl.DateTimeFormatOptions = {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                };
                dateTimeText = eventDate.toLocaleDateString('en-US', options);
            } catch (e) {
                dateTimeText = eventInfo.date_time;
            }
        }

        doc.roundedRect(rightSectionX, dateTimeY, rightSectionWidth, 45, 5)
            .fillAndStroke('#F8F9FA', '#E0E0E0')
            .lineWidth(1);

        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('DATE & TIME', rightSectionX + 10, dateTimeY + 8);

        doc.fontSize(14)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text(dateTimeText, rightSectionX + 10, dateTimeY + 25);

        // VENUE section - positioned at right, below DATE & TIME
        const venueY = dateTimeY + 60;
        let venueText = 'TBD';
        if (eventInfo?.event_venue && Array.isArray(eventInfo.event_venue) && eventInfo.event_venue.length > 0) {
            const venue = eventInfo.event_venue[0]?.venues;
            if (venue && venue.name) {
                venueText = venue.name;
            }
        }
        // Fallback to metadata if no venue relation found
        else if (eventInfo?.metadata && typeof eventInfo.metadata === 'object') {
            const metadata = eventInfo.metadata;
            if (metadata.venue || metadata.location) {
                venueText = metadata.venue || metadata.location;
            }
        }

        doc.roundedRect(rightSectionX, venueY, rightSectionWidth, 45, 5)
            .fillAndStroke('#F8F9FA', '#E0E0E0')
            .lineWidth(1);

        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('VENUE', rightSectionX + 10, venueY + 8);

        doc.fontSize(14)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text(venueText, rightSectionX + 10, venueY + 25); currentY += qrSectionHeight + 20;

        // TICKET TYPE section - left side, new row
        const customization = ticket.customization_data || {};

        doc.roundedRect(contentX, currentY, (pageWidth - 2 * contentX) / 2 - 10, 45, 5)
            .fillAndStroke('#FFF9E6', swayYellow)
            .lineWidth(1);

        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('TICKET TYPE', contentX + 10, currentY + 8);

        doc.fontSize(14)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text((ticket.products as any)?.name || 'Standard Ticket', contentX + 10, currentY + 25);

        // PRICE section - right side, same row as TICKET TYPE
        const priceX = contentX + (pageWidth - 2 * contentX) / 2 + 10;
        let priceText = 'TBD';

        if (ticket.products && (ticket.products as any).price !== undefined) {
            const product = ticket.products as any;
            const price = product.price;
            const currency = product.currency || 'EUR';

            if (price === 0) {
                priceText = 'FREE';
            } else {
                // Format price based on currency
                if (currency === 'EUR') {
                    priceText = `€${price.toFixed(2)}`;
                } else if (currency === 'USD') {
                    priceText = `$${price.toFixed(2)}`;
                } else {
                    priceText = `${price.toFixed(2)} ${currency}`;
                }
            }
        }

        doc.roundedRect(priceX, currentY, (pageWidth - 2 * contentX) / 2 - 10, 45, 5)
            .fillAndStroke('#F8F9FA', '#E0E0E0')
            .lineWidth(1);

        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('PRICE', priceX + 10, currentY + 8);

        doc.fontSize(14)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text(priceText, priceX + 10, currentY + 25);

        currentY += 65;

        // CLIENT NAME section (left side)
        doc.roundedRect(contentX, currentY, (pageWidth - 2 * contentX) / 2 - 10, 45, 5)
            .fillAndStroke('#F8F9FA', '#E0E0E0')
            .lineWidth(1);

        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('CLIENT NAME', contentX + 10, currentY + 8);

        doc.fontSize(14)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text(`${customization.firstName || ''} ${customization.lastName || ''}`, contentX + 10, currentY + 25);

        // 8. Order number section (right side)
        const orderX = contentX + (pageWidth - 2 * contentX) / 2 + 10;
        doc.roundedRect(orderX, currentY, (pageWidth - 2 * contentX) / 2 - 10, 45, 5)
            .fillAndStroke('#F8F9FA', '#E0E0E0')
            .lineWidth(1);

        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('ORDER NUMBER', orderX + 10, currentY + 8); doc.fontSize(12)
                .fill(darkGray)
                .font('Helvetica-Bold')
                .text(ticket.order_id, orderX + 10, currentY + 25); currentY += 65;        // Bottom section with logo and QR code info - positioned after the main container
        const logoBottomY = currentY + 20; // Position logo 20px after the main container
        const logoHeight = 25; // Reduced height from 30 to 25
        const logoWidth = 80; // Reduced width from 100 to 80
        const logoX = margin + 20; // Logo position from left
        const logoY = logoBottomY; // Logo vertical position

        console.log('Container ends at Y:', currentY);
        console.log('Logo will be placed at Y:', logoY, 'with dimensions:', logoWidth, 'x', logoHeight);        // Add logo using Netlify URL
        try {
            console.log('Logo area at position:', logoX, logoY, 'with dimensions:', logoWidth, 'x', logoHeight);

            // Use Netlify optimized image URL
            const logoUrl = `${process.env.BASE_URL || 'https://test.sway.events'}/images/black_logotype.jpg`;
            console.log('Fetching logo from Netlify URL:', logoUrl);

            try {
                // Fetch the image from Netlify CDN
                const response = await fetch(logoUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch logo: ${response.status}`);
                }

                const logoBuffer = Buffer.from(await response.arrayBuffer());
                console.log('Logo fetched successfully, size:', logoBuffer.length, 'bytes');

                // Use the fetched buffer
                doc.image(logoBuffer, logoX, logoY, {
                    width: logoWidth,
                    height: logoHeight
                });
                console.log('Logo loaded successfully from Netlify CDN');

            } catch (fetchError) {
                console.error('Failed to fetch logo from Netlify CDN:', fetchError);
                // Fallback to placeholder
                doc.rect(logoX, logoY, logoWidth, logoHeight)
                    .fillAndStroke('#FFBC00', '#E6A600')
                    .lineWidth(2);
                doc.fontSize(8)
                    .fill('#333333')
                    .font('Helvetica-Bold')
                    .text('NO LOGO', logoX + 5, logoY + logoHeight / 2 - 4);
            }

        } catch (err) {
            console.error('Error loading logo:', err);
            // Fallback to placeholder
            doc.rect(logoX, logoY, logoWidth, logoHeight)
                .fillAndStroke('#FFBC00', '#E6A600')
                .lineWidth(2);
            doc.fontSize(8)
                .fill('#333333')
                .font('Helvetica-Bold')
                .text('ERROR', logoX + 8, logoY + logoHeight / 2 - 4);
        }// QR Code info on the right side
        const qrInfoX = pageWidth - margin - 200; // Position from right with margin

        doc.fontSize(10)
            .fill(lightGray)
            .font('Helvetica')
            .text('QR CODE:', qrInfoX, logoBottomY, { width: 200, align: 'left' });

        doc.fontSize(9)
            .fill('#999999')
            .font('Helvetica')
            .text(ticket.qr_code_data || '', qrInfoX, logoBottomY + 15, {
                width: 200,
                align: 'left'
            });

        doc.end();
    });
}
