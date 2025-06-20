import PDFDocument from 'pdfkit';
import fs from 'fs';

export async function generateOrderReceiptPDF(order: any, orderProducts: any[], eventInfo: any): Promise<Buffer> {
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
        const margin = 40;

        // Sway colors
        const swayYellow = '#FFBC00';
        const darkGray = '#333333';
        const lightGray = '#666666';

        // 1. Header with company logo and title
        const headerHeight = 80;

        // Header background
        doc.rect(0, 0, pageWidth, headerHeight)
            .fill(swayYellow);

        // Company logo (left side)
        const logoHeight = 40;
        const logoWidth = 120;
        const logoX = margin;
        const logoY = (headerHeight - logoHeight) / 2;

        try {
            const logoUrl = `${process.env.BASE_URL || 'https://test.sway.events'}/images/black_logotype.jpg`;
            const response = await fetch(logoUrl);
            if (response.ok) {
                const logoBuffer = Buffer.from(await response.arrayBuffer());
                doc.image(logoBuffer, logoX, logoY, {
                    width: logoWidth,
                    height: logoHeight
                });
            } else {
                throw new Error('Logo fetch failed');
            }
        } catch (err) {
            // Fallback text
            doc.fontSize(16)
                .fill(darkGray)
                .font('Helvetica-Bold')
                .text('SWAY', logoX, logoY + 10);
        }

        // Receipt title (right side)
        doc.fontSize(24)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text('REÇU DE COMMANDE', pageWidth - margin - 200, logoY + 5, {
                width: 200,
                align: 'right'
            });

        let currentY = headerHeight + 30;

        // 2. Order Information Section
        const sectionSpacing = 25;

        // Order ID and Date section
        doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 100, 8)
            .fillAndStroke('#F8F9FA', '#E0E0E0')
            .lineWidth(1);

        const infoY = currentY + 20;

        // Order ID
        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('NUMÉRO DE COMMANDE', margin + 20, infoY);

        doc.fontSize(16)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text(order.id, margin + 20, infoY + 20);

        // Order Date
        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('DATE DE COMMANDE', pageWidth / 2, infoY);

        const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        doc.fontSize(16)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text(orderDate, pageWidth / 2, infoY + 20);

        // Order Status
        doc.fontSize(12)
            .fill(lightGray)
            .font('Helvetica')
            .text('STATUT', margin + 20, infoY + 50);

        doc.fontSize(14)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text(order.status.toUpperCase(), margin + 20, infoY + 70);

        currentY += 130;

        // 3. Customer Information Section
        doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 80, 8)
            .fillAndStroke('#F8F9FA', '#E0E0E0')
            .lineWidth(1);

        const customerY = currentY + 20;

        doc.fontSize(14)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text('INFORMATIONS CLIENT', margin + 20, customerY);

        if (order.buyer_email) {
            doc.fontSize(12)
                .fill(lightGray)
                .font('Helvetica')
                .text('Email:', margin + 20, customerY + 25);

            doc.fontSize(12)
                .fill(darkGray)
                .font('Helvetica')
                .text(order.buyer_email, margin + 80, customerY + 25);
        }

        currentY += 110;

        // 4. Event Information Section
        if (eventInfo) {
            doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 100, 8)
                .fillAndStroke('#FFF9E6', swayYellow)
                .lineWidth(1);

            const eventY = currentY + 20;

            doc.fontSize(14)
                .fill(darkGray)
                .font('Helvetica-Bold')
                .text('ÉVÉNEMENT', margin + 20, eventY);

            doc.fontSize(16)
                .fill(darkGray)
                .font('Helvetica-Bold')
                .text(eventInfo.title || 'Événement', margin + 20, eventY + 25);

            if (eventInfo.date_time) {
                const eventDate = new Date(eventInfo.date_time).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                doc.fontSize(12)
                    .fill(lightGray)
                    .font('Helvetica')
                    .text(eventDate, margin + 20, eventY + 50);
            }

            currentY += 130;
        }

        // 5. Products Table
        doc.fontSize(14)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text('PRODUITS COMMANDÉS', margin, currentY);

        currentY += 25;

        // Table header
        const tableHeaderHeight = 35;
        doc.roundedRect(margin, currentY, pageWidth - 2 * margin, tableHeaderHeight, 5)
            .fillAndStroke('#F1F3F4', '#E0E0E0')
            .lineWidth(1);

        const colWidths = {
            product: (pageWidth - 2 * margin) * 0.4,
            quantity: (pageWidth - 2 * margin) * 0.15,
            unitPrice: (pageWidth - 2 * margin) * 0.2,
            total: (pageWidth - 2 * margin) * 0.25
        };

        let colX = margin + 10;
        const headerY = currentY + 10;

        // Table headers
        doc.fontSize(10)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text('PRODUIT', colX, headerY);

        colX += colWidths.product;
        doc.text('QUANTITÉ', colX, headerY);

        colX += colWidths.quantity;
        doc.text('PRIX UNITAIRE', colX, headerY);

        colX += colWidths.unitPrice;
        doc.text('TOTAL', colX, headerY);

        currentY += tableHeaderHeight + 5;

        // Products rows
        let subtotal = 0;
        orderProducts.forEach((item, index) => {
            const rowHeight = 40;
            const isEven = index % 2 === 0;

            if (isEven) {
                doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
                    .fillAndStroke('#FAFAFA', '#E0E0E0')
                    .lineWidth(0.5);
            } else {
                doc.rect(margin, currentY, pageWidth - 2 * margin, rowHeight)
                    .fillAndStroke('white', '#E0E0E0')
                    .lineWidth(0.5);
            }

            colX = margin + 10;
            const rowY = currentY + 12;

            // Product name
            doc.fontSize(11)
                .fill(darkGray)
                .font('Helvetica')
                .text(item.products?.name || 'Produit inconnu', colX, rowY, {
                    width: colWidths.product - 10
                });

            // Quantity
            colX += colWidths.product;
            doc.text(item.quantity.toString(), colX, rowY);

            // Unit price
            colX += colWidths.quantity;
            const unitPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
            const currency = item.products?.currency || order.currency || 'EUR';
            doc.text(formatCurrency(unitPrice, currency), colX, rowY);

            // Total
            colX += colWidths.unitPrice;
            const lineTotal = unitPrice * item.quantity;
            subtotal += lineTotal;
            doc.text(formatCurrency(lineTotal, currency), colX, rowY);

            currentY += rowHeight;
        });

        // Totals section
        currentY += 20;
        const totalsWidth = 250;
        const totalsX = pageWidth - margin - totalsWidth;

        // Subtotal
        doc.roundedRect(totalsX, currentY, totalsWidth, 30, 5)
            .fillAndStroke('#F8F9FA', '#E0E0E0')
            .lineWidth(1);

        doc.fontSize(12)
            .fill(darkGray)
            .font('Helvetica')
            .text('Sous-total:', totalsX + 15, currentY + 8);

        doc.font('Helvetica-Bold')
            .text(formatCurrency(subtotal, order.currency), totalsX + 150, currentY + 8);

        currentY += 35;

        // Total final
        doc.roundedRect(totalsX, currentY, totalsWidth, 35, 5)
            .fillAndStroke(swayYellow, '#E6A600')
            .lineWidth(2);

        doc.fontSize(14)
            .fill(darkGray)
            .font('Helvetica-Bold')
            .text('TOTAL:', totalsX + 15, currentY + 10);

        const totalAmount = typeof order.total_amount === 'string' ?
            parseFloat(order.total_amount) : order.total_amount;

        doc.fontSize(16)
            .text(formatCurrency(totalAmount, order.currency), totalsX + 150, currentY + 8);

        // Footer
        currentY = pageHeight - 100;
        doc.fontSize(8)
            .fill(lightGray)
            .font('Helvetica')
            .text('Ce reçu a été généré automatiquement par Sway Events.', margin, currentY, {
                width: pageWidth - 2 * margin,
                align: 'center'
            });

        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, margin, currentY + 15, {
            width: pageWidth - 2 * margin,
            align: 'center'
        });

        doc.end();
    });
}

function formatCurrency(amount: number, currency: string): string {
    if (!amount || !currency) return '-';

    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency.toUpperCase()
    }).format(amount);
}
