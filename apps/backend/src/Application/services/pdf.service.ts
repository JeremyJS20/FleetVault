import PDFDocument from 'pdfkit';
import { put, get } from '@vercel/blob';
import { prisma } from '../../Infrastructure/db.js';

export class PdfService {
  private async fetchImageBuffer(url: string | null | undefined): Promise<Buffer | null> {
    if (!url) return null;
    try {
      if (url.startsWith('data:')) {
        const matches = url.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
        if (!matches) return null;
        return Buffer.from(matches[2], 'base64');
      }
      if (url.includes('.blob.vercel-storage.com')) {
        const result = await get(url, {
          access: 'private',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        if (!result || result.statusCode !== 200) return null;
        const reader = result.stream.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        return Buffer.concat(chunks);
      }
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  private drawHeaderBlock(doc: any, title: string, subtitle: string) {
    doc.save();
    // 1. Draw header background (#F0F4F8)
    doc.rect(0, 0, doc.page.width, 160).fill('#F0F4F8');

    // 2. Draw top decorative lines
    doc.rect(50, 20, 250, 4).fill('#0E8E9A');
    doc.rect(300, 20, doc.page.width - 350, 4).fill('#E2E8F0');

    // 3. Draw bottom decorative lines
    doc.rect(50, 140, 250, 4).fill('#0E8E9A');
    doc.rect(300, 140, doc.page.width - 350, 4).fill('#E2E8F0');

    // 4. Logo widget
    doc.roundedRect(doc.page.width - 110, 45, 60, 40, 6).fill('#1B2A4A');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14).text('FV', doc.page.width - 110, 52, { width: 60, align: 'center' });
    doc.fillColor('#1B2A4A').fontSize(7.5).text('FleetVault', doc.page.width - 110, 88, { width: 60, align: 'center' });

    // 5. Title
    doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(20).text(title, 50, 45);

    // 6. Subtitle
    doc.fillColor('#4B5563').font('Helvetica').fontSize(9).text(subtitle, 50, 75);

    // 7. Contact Info
    doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(8.5).text('✉  support@fleetvault.com', 50, 112);
    doc.text('📍  123 Main Street, Blue City CA 55555', 220, 112);

    doc.restore();
  }

  private drawCardContainer(doc: any, x: number, y: number, w: number, h: number, title: string) {
    doc.save();
    // Rounded white card
    doc.roundedRect(x, y, w, h, 12).fill('#FFFFFF');
    // Header title
    doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(12).text(title, x + 20, y + 18);
    // Decorative window dots
    const dotY = y + 22;
    const rightDotX = x + w - 30;
    doc.circle(rightDotX - 24, dotY, 3.5).fill('#0D6B7A');
    doc.circle(rightDotX - 12, dotY, 3.5).fill('#0D6B7A');
    doc.circle(rightDotX, dotY, 3.5).fill('#0D6B7A');
    doc.restore();
  }

  private drawTable(doc: any, x: number, y: number, width: number, rows: { label: string; value: string }[]): number {
    const rowHeight = 15;
    const colWidth = 110;
    const valueWidth = width - colWidth;
    
    doc.save();
    rows.forEach((row, i) => {
      const rowY = y + i * rowHeight;
      
      // Alternating background
      const bgFill = i % 2 === 1 ? '#F6F8FA' : '#FFFFFF';
      doc.rect(x, rowY, width, rowHeight).fill(bgFill);
      
      // Borders
      doc.lineWidth(0.5).strokeColor('#E2E8F0');
      doc.rect(x, rowY, width, rowHeight).stroke();
      doc.moveTo(x + colWidth, rowY).lineTo(x + colWidth, rowY + rowHeight).stroke();
      
      // Label text
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1B2A4A');
      doc.text(row.label, x + 8, rowY + 3.5, { width: colWidth - 16, lineBreak: false });
      
      // Value text
      doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
      doc.text(String(row.value || 'N/A'), x + colWidth + 8, rowY + 3.5, { width: valueWidth - 16, lineBreak: false });
    });
    doc.restore();
    return y + rows.length * rowHeight;
  }

  private drawSignatureBlock(doc: any, x: number, y: number, w: number, customerSigBuf: Buffer | null, representativeName: string) {
    doc.save();
    // Divider line
    doc.lineWidth(0.5).strokeColor('#E2E8F0');
    doc.moveTo(x + 20, y).lineTo(x + w - 20, y).stroke();
    
    const sigAreaY = y + 10;
    const halfW = w / 2;
    
    // Left: Customer
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1B2A4A');
    doc.text('Customer Signature', x + 40, sigAreaY);
    doc.moveTo(x + 40, sigAreaY + 60).lineTo(x + halfW - 20, sigAreaY + 60).stroke();
    
    if (customerSigBuf) {
      try {
        doc.image(customerSigBuf, x + 40, sigAreaY + 12, { fit: [halfW - 80, 45] });
      } catch {
        doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#9CA3AF').text('(Signature rendering error)', x + 40, sigAreaY + 25);
      }
    } else {
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#9CA3AF').text('(No signature captured)', x + 40, sigAreaY + 25);
    }
    
    // Right: Agent
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1B2A4A');
    doc.text('Authorized Representative', x + halfW + 20, sigAreaY);
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#4B5563');
    doc.text(representativeName, x + halfW + 20, sigAreaY + 25, { width: halfW - 40 });
    doc.moveTo(x + halfW + 20, sigAreaY + 60).lineTo(x + w - 40, sigAreaY + 60).stroke();
    doc.restore();
  }

  private startPolicyPage(doc: any, title: string, pageNum: number) {
    doc.addPage();
    doc.save();
    // Dark teal background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0D6B7A');
    // White container
    doc.roundedRect(50, 40, 495.28, 720, 12).fill('#FFFFFF');
    // Title
    doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(12).text(title, 70, 60);
    // Three dots
    doc.circle(470, 64, 3.5).fill('#0D6B7A');
    doc.circle(482, 64, 3.5).fill('#0D6B7A');
    doc.circle(494, 64, 3.5).fill('#0D6B7A');
    // Page number in white text on teal
    doc.fillColor('#FFFFFF').font('Helvetica').fontSize(9).text(String(pageNum), 530, 805);
    doc.restore();
    doc.y = 90;
  }

  async generateContractPdf(rental: any): Promise<string> {
    const sigBuf = await this.fetchImageBuffer(rental.signatureUrl);

    const policies = await prisma.rentalPolicy.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' }
    }).catch(() => []);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const filename = `rentcar/contracts/contract-${rental.id}-${Date.now()}.pdf`;
            const blob = await put(filename, buffer, {
              access: 'private',
              contentType: 'application/pdf',
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            resolve(blob.url);
          } catch (error) {
            reject(error);
          }
        });

        // 1. Draw top header block
        const formattedDate = new Date().toLocaleDateString();
        this.drawHeaderBlock(doc, 'FLEETVAULT RENTAL CONTRACT', `Contract Reference: ${rental.id} | Date: ${formattedDate}`);

        // 2. Draw main teal background
        doc.save();
        doc.rect(0, 160, doc.page.width, doc.page.height - 160).fill('#0D6B7A');
        doc.restore();

        // 3. Draw white information card (Width: 495.28, Height: 465)
        this.drawCardContainer(doc, 50, 180, 495.28, 465, 'Information');

        // Draw Table 1 (Lessor info) at Y = 220
        this.drawTable(doc, 70, 220, 455.28, [
          { label: 'Owner / Lessor', value: 'FleetVault Car Rentals' },
          { label: 'Address', value: '123 Main Street, Blue City CA 55555' },
          { label: 'Phone Number', value: '(555) 278-4476' },
          { label: 'Email', value: 'support@fleetvault.com' }
        ]);

        // Draw Table 2 (Renter info) at Y = 295
        this.drawTable(doc, 70, 295, 455.28, [
          { label: 'Renter Name', value: rental.customer?.name || 'N/A' },
          { label: 'Address', value: rental.customer?.address || 'N/A' },
          { label: 'Phone Number', value: rental.customer?.phone || 'N/A' },
          { label: 'Email', value: rental.customer?.email || 'N/A' }
        ]);

        // Draw Table 3 (Vehicle details) at Y = 370
        const vehicleInfo = `${rental.vehicle?.brand?.name || ''} ${rental.vehicle?.model?.name || 'N/A'}`;
        this.drawTable(doc, 70, 370, 455.28, [
          { label: 'Car / Model', value: vehicleInfo },
          { label: 'Plate Number', value: rental.vehicle?.plateNumber || 'N/A' },
          { label: 'Price (Daily)', value: `RD$ ${rental.pricePerDay.toFixed(2)}` },
          { label: 'Identification (VIN)', value: rental.vehicle?.chassisNumber || 'N/A' }
        ]);

        // Draw Table 4 (Checkout details) at Y = 445
        this.drawTable(doc, 70, 445, 455.28, [
          { label: 'Odometer (Out)', value: `${rental.checkoutOdometer} km` },
          { label: 'Fuel Level (Out)', value: rental.checkoutFuelLevel || 'N/A' },
          { label: 'Checked Out By', value: rental.checkoutEmployee?.name || 'N/A' }
        ]);

        // 4. Draw Signature Block at Y = 520
        this.drawSignatureBlock(doc, 50, 520, 495.28, sigBuf, rental.checkoutEmployee?.name || 'N/A');

        // 5. Draw Rental Term white text below the card (Y starts at 665)
        doc.save();
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('Rental Term', 70, 665);
        
        const rentalDateStr = new Date(rental.rentalDate).toLocaleDateString();
        const returnDateStr = new Date(rental.scheduledReturnDate).toLocaleDateString();
        
        doc.font('Helvetica').fontSize(8).fillColor('#FFFFFF');
        doc.text(`•  The term of this Car Rental Agreement runs from ${rentalDateStr} to ${returnDateStr}, upon completion of all terms of this agreement by both Parties.`, 70, 685, { width: 455.28 });
        doc.text(`•  The Parties may shorten or extend the estimated term of rental by mutual consent.`, 70, 715, { width: 455.28 });
        
        // Page number 1
        doc.text('1', 530, 805);
        doc.restore();

        // PAGES 2+: POLICIES & TERMS
        let currentPage = 1;
        
        // Start Policies Page
        currentPage++;
        this.startPolicyPage(doc, '7. RENTAL POLICIES', currentPage);

        doc.save();
        doc.fillColor('#2D3748'); // Dark charcoal text inside card

        if (policies.length > 0) {
          for (const policy of policies) {
            if (doc.y > 680) {
              currentPage++;
              this.startPolicyPage(doc, '7. RENTAL POLICIES (Continued)', currentPage);
              doc.fillColor('#2D3748');
            }
            doc.font('Helvetica-Bold').fontSize(9).text(policy.title, 70, doc.y + 10);
            doc.font('Helvetica').fontSize(7.5).text(policy.content, 70, doc.y + 3, { align: 'justify', width: 455.28 });
            doc.y += 10;
          }
        } else {
          doc.font('Helvetica').fontSize(8).text(
            'No se han configurado políticas de alquiler. Consulte los términos y condiciones para conocer las reglas aplicables.',
            70, 95, { align: 'justify', width: 455.28 }
          );
        }

        // Terms and conditions
        if (doc.y > 650) {
          currentPage++;
          this.startPolicyPage(doc, '8. TERMS & CONDITIONS', currentPage);
          doc.fillColor('#2D3748');
        } else {
          doc.y += 20;
          doc.font('Helvetica-Bold').fontSize(11).text('8. TERMS & CONDITIONS', 70, doc.y);
          doc.y += 5;
        }

        const terms = [
          '1. El cliente reconoce haber recibido el vehículo en buen estado según lo descrito en la inspección de salida.',
          '2. El cliente se compromete a devolver el vehículo en o antes de la fecha de devolución programada. Las devoluciones tardías incurrirán en penalidades según las políticas de FleetVault.',
          '3. El cliente es responsable por cualquier daño, pérdida o robo del vehículo durante el período de alquiler, incluyendo neumáticos, rines y accesorios.',
          '4. Se aplicarán recargos por diferencia de combustible si el vehículo se devuelve con menos combustible que en la salida, cobrados a la tarifa de mercado más una tarifa de servicio.',
          '5. Todas las penalidades, recargos y tarifas se detallan en la sección de Cargos anterior.',
          '6. El cliente autoriza a FleetVault a procesar cargos por cualquier monto pendiente, incluyendo daños identificados después de la devolución.',
          '7. Este contrato se rige por las leyes de la República Dominicana.'
        ];

        doc.font('Helvetica').fontSize(7.5);
        for (const term of terms) {
          if (doc.y > 700) {
            currentPage++;
            this.startPolicyPage(doc, '8. TERMS & CONDITIONS (Continued)', currentPage);
            doc.fillColor('#2D3748');
            doc.font('Helvetica').fontSize(7.5);
          }
          doc.text(term, 70, doc.y + 6, { align: 'justify', width: 455.28 });
        }

        doc.y += 15;
        doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#0D6B7A').text('Thank you for choosing FleetVault!', 70, doc.y, { align: 'center', width: 455.28 });

        doc.restore();
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateUtilizationReportPdf(data: { month: string; rate: number }[]): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const filename = `rentcar/reports/utilization-${Date.now()}.pdf`;
            const blob = await put(filename, buffer, {
              access: 'private',
              contentType: 'application/pdf',
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            resolve(blob.url);
          } catch (error) {
            reject(error);
          }
        });

        doc.fontSize(18).text('FLEETVAULT — UTILIZATION REPORT', { align: 'center', underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        const averageRate = data.length > 0
          ? Math.round(data.reduce((acc, curr) => acc + curr.rate, 0) / data.length)
          : 0;
        doc.fontSize(11).text(`Average Utilization: ${averageRate}%`);
        doc.moveDown();

        const tableTop = doc.y;
        const colX = [50, 250, 350];
        const colWidths = [180, 100, 200];

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Month', colX[0], tableTop);
        doc.text('Rate (%)', colX[1], tableTop);
        doc.text('Utilization', colX[2], tableTop);
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        let y = doc.y;
        for (const row of data) {
          doc.text(row.month, colX[0], y);
          doc.text(`${row.rate}%`, colX[1], y);

          const barWidth = Math.min(row.rate * 1.8, 180);
          doc.roundedRect(colX[2], y + 2, barWidth, 10, 3)
            .fill(row.rate > 75 ? '#22c55e' : row.rate > 50 ? '#eab308' : '#ef4444')
            .fill('#000');

          doc.text(`${row.rate}%`, colX[2] + 5, y + 1, { width: 40 });
          doc.fill('#000');
          y += 22;
        }

        doc.moveDown(2);
        doc.fontSize(8).text('Thank you for choosing FleetVault!', { align: 'center', oblique: true });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateRevenueReportPdf(data: Record<string, any>[], categories: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, layout: 'landscape' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const filename = `rentcar/reports/revenue-${Date.now()}.pdf`;
            const blob = await put(filename, buffer, {
              access: 'private',
              contentType: 'application/pdf',
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            resolve(blob.url);
          } catch (error) {
            reject(error);
          }
        });

        doc.fontSize(18).text('FLEETVAULT — REVENUE REPORT', { align: 'center', underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        const colCount = categories.length + 2;
        const pageWidth = doc.page.width - 100;
        const colW = pageWidth / colCount;
        const startX = 50;

        doc.fontSize(8).font('Helvetica-Bold');
        let y = doc.y;
        doc.text('Month', startX, y);
        categories.forEach((cat, i) => {
          doc.text(cat, startX + colW * (i + 1), y, { width: colW - 2 });
        });
        doc.text('Total', startX + colW * (colCount - 1), y, { width: colW - 2, align: 'right' });
        y += 16;

        doc.fontSize(7).font('Helvetica');
        for (const row of data) {
          const monthlySum = categories.reduce((sum, cat) => sum + (row[cat] || 0), 0);
          doc.text(row.month, startX, y, { width: colW - 2 });
          categories.forEach((cat, i) => {
            doc.text((row[cat] || 0).toFixed(2), startX + colW * (i + 1), y, { width: colW - 2, align: 'right' });
          });
          doc.text(monthlySum.toFixed(2), startX + colW * (colCount - 1), y, { width: colW - 2, align: 'right' });
          y += 14;
        }

        doc.moveDown(2);
        doc.fontSize(8).text('Thank you for choosing FleetVault!', { align: 'center', oblique: true });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateCommissionsReportPdf(data: {
    employeeId: string;
    name: string;
    commissionPercentage: number;
    salesCount: number;
    commissionAmount: number;
    payoutStatus: string;
  }[]): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const filename = `rentcar/reports/commissions-${Date.now()}.pdf`;
            const blob = await put(filename, buffer, {
              access: 'private',
              contentType: 'application/pdf',
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            resolve(blob.url);
          } catch (error) {
            reject(error);
          }
        });

        doc.fontSize(18).text('FLEETVAULT — COMMISSIONS REPORT', { align: 'center', underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        const colX = [50, 200, 310, 390, 470];
        doc.fontSize(9).font('Helvetica-Bold');
        let y = doc.y;
        doc.text('Employee', colX[0], y);
        doc.text('Sales', colX[1], y);
        doc.text('Comm %', colX[2], y);
        doc.text('Amount (RD$)', colX[3], y);
        doc.text('Status', colX[4], y);
        y += 16;

        doc.fontSize(9).font('Helvetica');
        for (const row of data) {
          doc.text(row.name, colX[0], y, { width: 140 });
          doc.text(String(row.salesCount), colX[1], y);
          doc.text(`${row.commissionPercentage}%`, colX[2], y);
          doc.text(row.commissionAmount.toFixed(2), colX[3], y);
          doc.text(row.payoutStatus === 'PAID' ? 'PAID' : 'UNPAID', colX[4], y);
          y += 16;
        }

        const totalCommission = data.reduce((sum, r) => sum + r.commissionAmount, 0);
        y += 8;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text(`Total Commissions: RD$${totalCommission.toFixed(2)}`, colX[0], y);

        doc.moveDown(2);
        doc.fontSize(8).text('Thank you for choosing FleetVault!', { align: 'center', oblique: true });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateReturnReceiptPdf(rental: any): Promise<string> {
    const returnSigBuf = await this.fetchImageBuffer(rental.returnSignatureUrl);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const filename = `rentcar/receipts/receipt-${rental.id}-${Date.now()}.pdf`;
            const blob = await put(filename, buffer, {
              access: 'private',
              contentType: 'application/pdf',
              token: process.env.BLOB_READ_WRITE_TOKEN,
            });
            resolve(blob.url);
          } catch (error) {
            reject(error);
          }
        });

        // 1. Draw top header block
        const formattedDate = new Date().toLocaleDateString();
        this.drawHeaderBlock(doc, 'FLEETVAULT RETURN RECEIPT', `Contract Reference: ${rental.id} | Return Date: ${formattedDate}`);

        // 2. Draw main teal background
        doc.save();
        doc.rect(0, 160, doc.page.width, doc.page.height - 160).fill('#0D6B7A');
        doc.restore();

        // 3. Draw white information card
        this.drawCardContainer(doc, 50, 180, 495.28, 465, 'Information');

        // Draw Table 1 (Lessor info) at Y = 220
        this.drawTable(doc, 70, 220, 455.28, [
          { label: 'Owner / Lessor', value: 'FleetVault Car Rentals' },
          { label: 'Address', value: '123 Main Street, Blue City CA 55555' },
          { label: 'Phone Number', value: '(555) 278-4476' },
          { label: 'Email', value: 'support@fleetvault.com' }
        ]);

        // Draw Table 2 (Renter info) at Y = 295
        this.drawTable(doc, 70, 295, 455.28, [
          { label: 'Renter Name', value: rental.customer?.name || 'N/A' },
          { label: 'National ID / RNC', value: rental.customer?.nationalId || 'N/A' },
          { label: 'Phone Number', value: rental.customer?.phone || 'N/A' },
          { label: 'Email', value: rental.customer?.email || 'N/A' }
        ]);

        // Draw Table 3 (Vehicle details) at Y = 370
        const vehicleInfo = `${rental.vehicle?.brand?.name || ''} ${rental.vehicle?.model?.name || 'N/A'}`;
        this.drawTable(doc, 70, 370, 455.28, [
          { label: 'Car / Model', value: vehicleInfo },
          { label: 'Plate Number', value: rental.vehicle?.plateNumber || 'N/A' },
          { label: 'Return Odometer', value: `${rental.returnOdometer || rental.checkoutOdometer} km` },
          { label: 'Return Fuel Level', value: rental.returnFuelLevel || 'N/A' }
        ]);

        // Draw Table 4 (Financial Settlement) at Y = 445
        const rentalDays = Math.ceil(
          (new Date(rental.actualReturnDate || rental.scheduledReturnDate).getTime() -
            new Date(rental.rentalDate).getTime()) / (1000 * 60 * 60 * 24)
        ) || 1;
        const baseCost = rentalDays * rental.pricePerDay;
        const penaltyTotal = (rental.totalCost || 0) - baseCost;

        this.drawTable(doc, 70, 445, 455.28, [
          { label: 'Base Cost', value: `RD$ ${baseCost.toFixed(2)} (${rentalDays} days)` },
          { label: 'Penalties & Fees', value: `RD$ ${penaltyTotal.toFixed(2)}` },
          { label: 'Total Paid', value: `RD$ ${(rental.totalCost || 0).toFixed(2)}` }
        ]);

        // 4. Draw Signature Block at Y = 520
        this.drawSignatureBlock(doc, 50, 520, 495.28, returnSigBuf, rental.returnEmployee?.name || 'N/A');

        // 5. Draw Settlement text below the card (Y starts at 665)
        doc.save();
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('Settlement Notes', 70, 665);
        
        doc.font('Helvetica').fontSize(8).fillColor('#FFFFFF');
        
        const totalCharged = rental.totalCost || 0;
        const isCorporate = !!rental.purchaseOrderNumber;
        const hasCashTx = rental.transactions?.some((t: any) => t.type === 'CASH');
        
        if (isCorporate) {
          doc.text(`•  Corporate Billing: Bill PO ${rental.purchaseOrderNumber || 'N/A'} for the amount of RD$ ${totalCharged.toFixed(2)}.`, 70, 685, { width: 455.28 });
        } else if (hasCashTx) {
          const checkoutTx = rental.transactions?.find((t: any) => t.type === 'CASH' && t.comments?.includes('collected'));
          const initialPaid = checkoutTx ? checkoutTx.amount : 0;
          const diff = initialPaid - totalCharged;
          if (diff > 0) {
            doc.text(`•  Cash Adjustment: Refund RD$ ${diff.toFixed(2)} in cash to the customer (Deposit Refund).`, 70, 685, { width: 455.28 });
          } else if (diff < 0) {
            doc.text(`•  Cash Adjustment: Collect additional RD$ ${Math.abs(diff).toFixed(2)} in cash from the customer.`, 70, 685, { width: 455.28 });
          } else {
            doc.text(`•  Cash Settlement: Fully settled with no outstanding balance or refunds.`, 70, 685, { width: 455.28 });
          }
        } else {
          doc.text(`•  Electronic Transaction: Charged RD$ ${totalCharged.toFixed(2)} via registered Payment Card.`, 70, 685, { width: 455.28 });
        }
        
        doc.text(`•  All vehicle conditions verified against pickup checklist.`, 70, 715, { width: 455.28 });
        
        // Page number 1
        doc.text('1', 530, 805);
        doc.restore();

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
