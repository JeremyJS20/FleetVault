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

  private translateFuelLevel(level: string | null | undefined): string {
    if (!level) return 'N/A';
    const mappings: Record<string, string> = {
      'FULL': 'Lleno',
      'THREE_QUARTERS': '3/4',
      'HALF': 'Medio',
      'QUARTER': '1/4',
      'EMPTY': 'Vacío'
    };
    return mappings[level.toUpperCase()] || level;
  }

  private drawInvoiceHeader(doc: any, title: string, subtitle: string) {
    doc.save();
    // 1. Draw right header background (#0D6B7A)
    doc.rect(200, 0, doc.page.width - 200, 110).fill('#0D6B7A');

    // 2. Draw slanted dark navy polygon on left (#1B2A4A)
    doc.moveTo(0, 0)
       .lineTo(240, 0)
       .lineTo(200, 110)
       .lineTo(0, 110)
       .closePath()
       .fill('#1B2A4A');

    // 3. Logo circle badge
    doc.circle(70, 55, 20).fill('#FFFFFF');
    doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(13).text('FV', 50, 48.5, { width: 40, align: 'center' });

    // 4. Company Name
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14).text('FleetVault', 105, 42);
    doc.font('Helvetica').fontSize(8.5).fillColor('#CBD5E1').text('Servicios de Alquiler', 105, 60);

    // 5. Contact Details (on right)
    doc.fillColor('#FFFFFF').font('Helvetica').fontSize(8.5);
    doc.text('✉  support@fleetvault.com', 380, 36, { align: 'right', width: doc.page.width - 425 });
    doc.text('📍  123 Main Street, Blue City CA', 380, 52, { align: 'right', width: doc.page.width - 425 });
    doc.text('🌐  www.fleetvault.com', 380, 68, { align: 'right', width: doc.page.width - 425 });

    doc.restore();
  }

  private drawLabelValueGrid(doc: any, x: number, y: number, items: { label: string; value: string }[]) {
    doc.save();
    const lineSpacing = 13;
    const labelWidth = 90;
    
    items.forEach((item, i) => {
      const itemY = y + i * lineSpacing;
      
      // Label text
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1B2A4A');
      doc.text(item.label, x, itemY, { width: labelWidth });
      
      // Aligned value with colon
      doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
      doc.text(`:   ${item.value || 'N/A'}`, x + labelWidth, itemY, { width: 180 });
    });
    
    doc.restore();
  }

  private drawInvoiceTable(doc: any, x: number, y: number, width: number, rows: { desc: string; rate: string; qty: string; subtotal: string }[], subtotalCost: number, taxAmount: number, totalCost: number): number {
    doc.save();
    
    const colWidths = {
      desc: width - 260,
      rate: 90,
      qty: 70,
      subtotal: 100
    };
    
    const colX = {
      desc: x,
      rate: x + colWidths.desc,
      qty: x + colWidths.desc + colWidths.rate,
      subtotal: x + colWidths.desc + colWidths.rate + colWidths.qty
    };
    
    const rowHeight = 16;
    
    // 1. Draw Table Header Row (#0D6B7A)
    doc.rect(x, y, width, rowHeight).fill('#0D6B7A');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
    doc.text('Descripción', colX.desc + 8, y + 4, { width: colWidths.desc - 16 });
    doc.text('Tarifa', colX.rate, y + 4, { width: colWidths.rate - 8, align: 'right' });
    doc.text('Cantidad', colX.qty, y + 4, { width: colWidths.qty, align: 'center' });
    doc.text('Subtotal', colX.subtotal, y + 4, { width: colWidths.subtotal - 8, align: 'right' });
    
    let currentY = y + rowHeight;
    
    // 2. Draw Rows
    rows.forEach((row, i) => {
      const bg = i % 2 === 1 ? '#F6F8FA' : '#FFFFFF';
      doc.rect(x, currentY, width, rowHeight).fill(bg);
      
      doc.lineWidth(0.5).strokeColor('#E2E8F0');
      doc.rect(x, currentY, width, rowHeight).stroke();
      
      doc.moveTo(colX.rate, currentY).lineTo(colX.rate, currentY + rowHeight).stroke();
      doc.moveTo(colX.qty, currentY).lineTo(colX.qty, currentY + rowHeight).stroke();
      doc.moveTo(colX.subtotal, currentY).lineTo(colX.subtotal, currentY + rowHeight).stroke();
      
      doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
      doc.text(row.desc, colX.desc + 8, currentY + 4, { width: colWidths.desc - 16, lineBreak: false });
      doc.text(row.rate, colX.rate, currentY + 4, { width: colWidths.rate - 8, align: 'right', lineBreak: false });
      doc.text(row.qty, colX.qty, currentY + 4, { width: colWidths.qty, align: 'center', lineBreak: false });
      doc.text(row.subtotal, colX.subtotal, currentY + 4, { width: colWidths.subtotal - 8, align: 'right', lineBreak: false });
      
      currentY += rowHeight;
    });
    
    // 3. Draw Totals block
    const totalsWidth = colWidths.qty + colWidths.subtotal;
    const totalsX = colX.qty;
    
    // Taxes (0%)
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1B2A4A');
    doc.text('Impuestos (0%):', totalsX - 80, currentY + 4, { width: 140, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#4B5563');
    doc.text(`RD$ ${taxAmount.toFixed(2)}`, colX.subtotal, currentY + 4, { width: colWidths.subtotal - 8, align: 'right' });
    currentY += rowHeight;
    
    // Total Charges Row (shaded box)
    doc.rect(totalsX - 80, currentY, totalsWidth + 80, rowHeight).fill('#FAF2E8');
    doc.lineWidth(0.5).strokeColor('#E2E8F0');
    doc.rect(totalsX - 80, currentY, totalsWidth + 80, rowHeight).stroke();
    
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1B2A4A');
    doc.text('Total de Cargos:', totalsX - 80, currentY + 4, { width: 140, align: 'right' });
    doc.text(`RD$ ${totalCost.toFixed(2)}`, colX.subtotal, currentY + 4, { width: colWidths.subtotal - 8, align: 'right' });
    
    currentY += rowHeight;
    
    doc.restore();
    return currentY;
  }

  private drawContinuationHeader(doc: any, title: string) {
    doc.save();
    // Right accent block
    doc.rect(200, 0, doc.page.width - 200, 40).fill('#0D6B7A');
    // Left slanted block
    doc.moveTo(0, 0)
       .lineTo(240, 0)
       .lineTo(220, 40)
       .lineTo(0, 40)
       .closePath()
       .fill('#1B2A4A');
    // Title inside Left block
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text(title, 45, 15);
    doc.restore();
  }

  private drawFooterPageNumber(doc: any, pageNum: string | number) {
    doc.save();
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fillColor('#9CA3AF').font('Helvetica').fontSize(8.5);
    doc.text(String(pageNum), doc.page.width - 60, doc.page.height - 30, { align: 'right' });
    doc.page.margins.bottom = oldBottom;
    doc.restore();
  }

  private startContinuationPage(doc: any, title: string, pageNum: number) {
    doc.addPage();
    this.drawContinuationHeader(doc, title);
    this.drawFooterPageNumber(doc, pageNum);
    doc.y = 60;
  }

  private drawSignatureSection(doc: any, x: number, y: number, width: number, customerSigBuf: Buffer | null, representativeName: string) {
    doc.save();
    const lineW = 180;
    
    // Draw signature line
    doc.lineWidth(0.5).strokeColor('#4B5563');
    doc.moveTo(x + width - lineW, y + 45).lineTo(x + width, y + 45).stroke();
    
    // Draw image signature if captured
    if (customerSigBuf) {
      try {
        doc.image(customerSigBuf, x + width - lineW + 20, y - 5, { fit: [lineW - 40, 45] });
      } catch {
        doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#9CA3AF').text('(Signature error)', x + width - lineW + 20, y + 10);
      }
    } else {
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#9CA3AF').text('(No signature)', x + width - lineW + 20, y + 10);
    }
    
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1B2A4A');
    doc.text(representativeName, x + width - lineW, y + 50, { width: lineW, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
    doc.text('Authorized Sign', x + width - lineW, y + 60, { width: lineW, align: 'center' });
    doc.restore();
  }

  async generateContractPdf(rental: any): Promise<string> {
    const sigBuf = await this.fetchImageBuffer(rental.signatureUrl);

    const policies = await prisma.rentalPolicy.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' }
    }).catch(() => []);

    const fees = await prisma.feeConfig.findMany().catch(() => []);
    const feeMap: Record<string, number> = {};
    for (const fee of fees) {
      feeMap[fee.key] = fee.amount;
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 45, size: 'A4' });
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

        // 1. Draw invoice header
        const formattedDate = new Date().toLocaleDateString();
        this.drawInvoiceHeader(doc, 'CONTRATO DE ALQUILER FLEETVAULT', `Referencia de Contrato: ${rental.id} | Fecha: ${formattedDate}`);

        // 2. Title & Reference
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(14).text('CONTRATO DE ALQUILER', 45, 130);
        doc.fillColor('#4B5563').font('Helvetica').fontSize(8.5).text(`Referencia: ${rental.id}`, 45, 150);

        // 3. Columns: Renter Info (Column 1) vs Contract Info (Column 2)
        // Column 1 (X=45)
        this.drawLabelValueGrid(doc, 45, 175, [
          { label: 'FACTURAR A', value: rental.customer?.name || 'N/A' },
          { label: 'Dirección', value: rental.customer?.address || 'N/A' },
          { label: 'Cédula / RNC', value: rental.customer?.nationalId || 'N/A' },
          { label: 'Correo', value: rental.customer?.email || 'N/A' },
          { label: 'Teléfono', value: rental.customer?.phone || 'N/A' }
        ]);

        // Column 2 (X=350)
        this.drawLabelValueGrid(doc, 350, 175, [
          { label: 'Número de Contrato', value: rental.id.substring(0, 15) + '...' },
          { label: 'Fecha de Contrato', value: formattedDate },
          { label: 'Agente de Salida', value: rental.checkoutEmployee?.name || 'N/A' }
        ]);

        // 4. Vehicle Information (Y=255)
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('INFORMACIÓN DEL VEHÍCULO', 45, 255);
        const vehicleInfo = `${rental.vehicle?.brand?.name || ''} ${rental.vehicle?.model?.name || 'N/A'}`;
        const rentalDateStr = new Date(rental.rentalDate).toLocaleDateString();
        const returnDateStr = new Date(rental.scheduledReturnDate).toLocaleDateString();
        const rentalPeriod = `${rentalDateStr} - ${returnDateStr}`;

        this.drawLabelValueGrid(doc, 45, 270, [
          { label: 'Modelo', value: vehicleInfo },
          { label: 'Placa', value: rental.vehicle?.plateNumber || 'N/A' },
          { label: 'Período de Alquiler', value: rentalPeriod }
        ]);

        // 5. Checkout Conditions (Column 2: X=350, Y=255)
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('ESTADO DE SALIDA', 350, 255);
        this.drawLabelValueGrid(doc, 350, 270, [
          { label: 'Odómetro (Salida)', value: `${rental.checkoutOdometer} km` },
          { label: 'Combustible (Salida)', value: this.translateFuelLevel(rental.checkoutFuelLevel) }
        ]);

        // 6. Charges Table (Y=330)
        const rentalDays = Math.ceil(
          (new Date(rental.scheduledReturnDate).getTime() - new Date(rental.rentalDate).getTime()) / (1000 * 60 * 60 * 24)
        ) || 1;
        const baseCost = rentalDays * rental.pricePerDay;

        const tableRows = [
          {
            desc: 'Cargos por Alquiler de Vehículo',
            rate: `$ ${rental.pricePerDay.toFixed(2)}`,
            qty: `${rentalDays} día${rentalDays > 1 ? 's' : ''}`,
            subtotal: `$ ${baseCost.toFixed(2)}`
          }
        ];

        const isCorporate = rental.customer?.type === 'CORPORATE';
        const depositAmount = feeMap['SECURITY_DEPOSIT'] ?? 15000;

        if (!isCorporate) {
          tableRows.push({
            desc: 'Retención de Depósito de Seguridad',
            rate: `$ ${depositAmount.toFixed(2)}`,
            qty: '1 retención',
            subtotal: `$ ${depositAmount.toFixed(2)}`
          });
        }

        const totalCost = baseCost + (isCorporate ? 0 : depositAmount);
        
        const endTableY = this.drawInvoiceTable(doc, 45, 330, 505.28, tableRows, baseCost, 0, totalCost);

        // 7. Payment Information (Y = endTableY + 15)
        const paymentY = endTableY + 15;
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('INFORMACIÓN DE PAGO', 45, paymentY);
        
        const paymentMethodVal = rental.purchaseOrderNumber ? 'Orden de Compra' : (rental.stripePaymentIntentId ? 'Tarjeta de Crédito (Stripe)' : 'Efectivo');
        const paymentRefVal = rental.purchaseOrderNumber || (rental.stripePaymentIntentId ? rental.stripePaymentIntentId.substring(0, 18) + '...' : 'Pago en Efectivo');
        
        this.drawLabelValueGrid(doc, 45, paymentY + 15, [
          { label: 'Método de Pago', value: paymentMethodVal },
          { label: 'Código de Referencia', value: paymentRefVal }
        ]);

        // 8. Notes & Signature
        const notesY = paymentY + 55;
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('NOTAS', 45, notesY);
        doc.font('Helvetica').fontSize(7.5).fillColor('#4B5563');
        doc.text(
          'Gracias por elegir FleetVault Rental para sus necesidades de alquiler de vehículos. Si tiene alguna pregunta sobre este contrato o necesita asistencia adicional, comuníquese con soporte.',
          45, notesY + 15, { width: 260, align: 'justify' }
        );

        // Signature on the right
        this.drawSignatureSection(doc, 45, paymentY + 15, 505.28, sigBuf, rental.customer?.name || 'Firma del Cliente');

        // Footer page number 1
        this.drawFooterPageNumber(doc, 1);

        // PAGES 2+: POLICIES & TERMS
        let currentPage = 1;
        
        // Start Policies Page
        currentPage++;
        this.startContinuationPage(doc, '7. POLÍTICAS DE ALQUILER', currentPage);

        doc.save();
        doc.fillColor('#2D3748');

        if (policies.length > 0) {
          for (const policy of policies) {
            if (doc.y > doc.page.height - 70) {
              currentPage++;
              this.startContinuationPage(doc, '7. POLÍTICAS DE ALQUILER (Continuación)', currentPage);
              doc.fillColor('#2D3748');
            }
            doc.font('Helvetica-Bold').fontSize(9).text(policy.title, 45, doc.y + 10);
            doc.font('Helvetica').fontSize(7.5).text(policy.content, 45, doc.y + 3, { align: 'justify', width: 505.28 });
            doc.y += 10;
          }
        } else {
          doc.font('Helvetica').fontSize(8).text(
            'No se han configurado políticas de alquiler. Consulte los términos y condiciones para conocer las reglas aplicables.',
            45, 80, { align: 'justify', width: 505.28 }
          );
        }

        // Terms and conditions
        if (doc.y > doc.page.height - 120) {
          currentPage++;
          this.startContinuationPage(doc, '8. TÉRMINOS Y CONDICIONES', currentPage);
          doc.fillColor('#2D3748');
        } else {
          doc.y += 20;
          doc.font('Helvetica-Bold').fontSize(11).text('8. TÉRMINOS Y CONDICIONES', 45, doc.y);
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
          if (doc.y > doc.page.height - 50) {
            currentPage++;
            this.startContinuationPage(doc, '8. TÉRMINOS Y CONDICIONES (Continuación)', currentPage);
            doc.fillColor('#2D3748');
            doc.font('Helvetica').fontSize(7.5);
          }
          doc.text(term, 45, doc.y + 6, { align: 'justify', width: 505.28 });
        }

        doc.y += 15;
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#0D6B7A').text('¡Gracias por elegir FleetVault!', 45, doc.y, { align: 'center', width: 505.28 });

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

    // Load fee config outside the promise to prevent await inside the executor
    const fees = await prisma.feeConfig.findMany().catch(() => []);
    const feeMap: Record<string, number> = {};
    for (const fee of fees) {
      feeMap[fee.key] = fee.amount;
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 45, size: 'A4' });
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

        // 1. Draw invoice header
        const formattedDate = new Date().toLocaleDateString();
        this.drawInvoiceHeader(doc, 'RECIBO DE DEVOLUCIÓN FLEETVAULT', `Referencia de Contrato: ${rental.id} | Fecha: ${formattedDate}`);

        // 2. Title & Reference
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(14).text('RECIBO DE DEVOLUCIÓN', 45, 130);
        doc.fillColor('#4B5563').font('Helvetica').fontSize(8.5).text(`Referencia: ${rental.id}`, 45, 150);

        // 3. Columns: Renter Info (Column 1) vs Receipt Info (Column 2)
        // Column 1 (X=45)
        this.drawLabelValueGrid(doc, 45, 175, [
          { label: 'FACTURAR A', value: rental.customer?.name || 'N/A' },
          { label: 'Dirección', value: rental.customer?.address || 'N/A' },
          { label: 'Cédula / RNC', value: rental.customer?.nationalId || 'N/A' },
          { label: 'Correo', value: rental.customer?.email || 'N/A' },
          { label: 'Teléfono', value: rental.customer?.phone || 'N/A' }
        ]);

        // Column 2 (X=350)
        this.drawLabelValueGrid(doc, 350, 175, [
          { label: 'Número de Factura', value: rental.id.substring(0, 15) + '...' },
          { label: 'Fecha de Devolución', value: rental.actualReturnDate ? new Date(rental.actualReturnDate).toLocaleDateString() : formattedDate },
          { label: 'Agente de Recibo', value: rental.returnEmployee?.name || 'N/A' }
        ]);

        // 4. Vehicle Information (Y=255)
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('INFORMACIÓN DEL VEHÍCULO', 45, 255);
        const vehicleInfo = `${rental.vehicle?.brand?.name || ''} ${rental.vehicle?.model?.name || 'N/A'}`;
        const rentalDateStr = new Date(rental.rentalDate).toLocaleDateString();
        const returnDateStr = rental.actualReturnDate ? new Date(rental.actualReturnDate).toLocaleDateString() : formattedDate;
        const rentalPeriod = `${rentalDateStr} - ${returnDateStr}`;

        this.drawLabelValueGrid(doc, 45, 270, [
          { label: 'Modelo', value: vehicleInfo },
          { label: 'Placa', value: rental.vehicle?.plateNumber || 'N/A' },
          { label: 'Período de Alquiler', value: rentalPeriod }
        ]);

        // 5. Checkout Conditions (Column 2: X=350, Y=255)
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('ESTADO DE DEVOLUCIÓN', 350, 255);
        this.drawLabelValueGrid(doc, 350, 270, [
          { label: 'Odómetro (Entrada)', value: `${rental.returnOdometer || rental.checkoutOdometer} km` },
          { label: 'Combustible (Entrada)', value: this.translateFuelLevel(rental.returnFuelLevel) }
        ]);

        // 6. Charges Table (Y=330)
        const rentalDays = Math.ceil(
          (new Date(rental.actualReturnDate || rental.scheduledReturnDate).getTime() - new Date(rental.rentalDate).getTime()) / (1000 * 60 * 60 * 24)
        ) || 1;
        const baseCost = rentalDays * rental.pricePerDay;

        const tableRows = [
          {
            desc: 'Cargos por Alquiler de Vehículo',
            rate: `$ ${rental.pricePerDay.toFixed(2)}`,
            qty: `${rentalDays} día${rentalDays > 1 ? 's' : ''}`,
            subtotal: `$ ${baseCost.toFixed(2)}`
          }
        ];

        // Recalculate Penalties to populate table items:
        const pickupInsp = rental.inspections?.find((i: any) => i.type === 'PICKUP');
        const returnInsp = rental.inspections?.find((i: any) => i.type === 'RETURN');
        
        let lateFee = 0;
        let fuelFee = 0;
        let damageFee = 0;
        
        // Late Fee calculation
        if (rental.actualReturnDate && rental.actualReturnDate > rental.scheduledReturnDate) {
          const lateFeePerHour = feeMap['LATE_FEE_PER_HOUR'] ?? 1500;
          const diffMs = new Date(rental.actualReturnDate).getTime() - new Date(rental.scheduledReturnDate).getTime();
          const lateHours = diffMs / (1000 * 60 * 60);
          if (lateHours > 1.0) {
            lateFee = parseFloat((lateHours * lateFeePerHour).toFixed(2));
          }
        }
        
        // Fuel Fee calculation
        if (returnInsp && pickupInsp) {
          const FUEL_VALUES: Record<string, number> = { 'EMPTY': 0, 'QUARTER': 1, 'HALF': 2, 'THREE_QUARTERS': 3, 'FULL': 4 };
          const checkoutVal = FUEL_VALUES[rental.checkoutFuelLevel] ?? 4;
          const returnVal = FUEL_VALUES[returnInsp.fuelGaugeLevel] ?? 4;
          const fuelDifference = Math.max(0, checkoutVal - returnVal);
          if (fuelDifference > 0) {
            const fuelFlatFee = feeMap['FUEL_FLAT_FEE'] ?? 2000;
            const fuelPerStep = feeMap['FUEL_PER_STEP'] ?? 1000;
            fuelFee = fuelFlatFee + (fuelDifference * fuelPerStep);
          }
        }
        
        // Damage Fee calculation
        if (returnInsp && pickupInsp) {
          const glassFeeAmount = feeMap['GLASS_DAMAGE'] ?? 12000;
          const scratchesFeeAmount = feeMap['SCRATCHES'] ?? 8000;
          const tireFeeAmount = feeMap['TIRE_DAMAGE'] ?? 5000;
          
          const glassFee = returnInsp.hasBrokenGlass && !pickupInsp.hasBrokenGlass ? glassFeeAmount : 0;
          const scratchesFee = returnInsp.hasScratches && !pickupInsp.hasScratches ? scratchesFeeAmount : 0;
          
          const tirePositions = ['tireConditionFrontLeft', 'tireConditionFrontRight', 'tireConditionRearLeft', 'tireConditionRearRight'] as const;
          const isDamaged = (cond: string) => cond === 'DAMAGED' || cond === 'MISSING';
          const newTiresCount = tirePositions.filter(p =>
            isDamaged(returnInsp[p]) && !isDamaged(pickupInsp[p] ?? 'GOOD')
          ).length;
          const tiresFee = newTiresCount * tireFeeAmount;
          damageFee = glassFee + scratchesFee + tiresFee;
        }

        if (lateFee > 0) {
          tableRows.push({
            desc: 'Penalización por Devolución Tardía',
            rate: `$ ${(feeMap['LATE_FEE_PER_HOUR'] ?? 1500).toFixed(2)}/h`,
            qty: 'Horas Extras',
            subtotal: `$ ${lateFee.toFixed(2)}`
          });
        }
        
        if (fuelFee > 0) {
          tableRows.push({
            desc: 'Cargo por Servicio de Reabastecimiento',
            rate: 'Tarifa Fija + Niveles',
            qty: 'Combustible Faltante',
            subtotal: `$ ${fuelFee.toFixed(2)}`
          });
        }
        
        if (damageFee > 0) {
          tableRows.push({
            desc: 'Cargos por Daños al Vehículo',
            rate: 'Daño Inspeccionado',
            qty: 'Daño Registrado',
            subtotal: `$ ${damageFee.toFixed(2)}`
          });
        }

        const totalCost = rental.totalCost || (baseCost + lateFee + fuelFee + damageFee);
        
        const endTableY = this.drawInvoiceTable(doc, 45, 330, 505.28, tableRows, baseCost, 0, totalCost);

        // 7. Payment Information (Y = endTableY + 15)
        const paymentY = endTableY + 15;
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('PAGO Y AJUSTES', 45, paymentY);
        
        const isCorporate = !!rental.purchaseOrderNumber;
        const hasCashTx = rental.transactions?.some((t: any) => t.type === 'CASH');
        const paymentMethodVal = isCorporate ? 'Orden de Compra' : (hasCashTx ? 'Pago en Efectivo' : 'Tarjeta de Crédito (Stripe)');
        
        const paymentItems = [
          { label: 'Método de Pago', value: paymentMethodVal }
        ];

        if (isCorporate) {
          paymentItems.push({ label: 'Facturación OC', value: `Cobrar OC ${rental.purchaseOrderNumber || 'N/A'}` });
        } else if (hasCashTx) {
          const checkoutTx = rental.transactions?.find((t: any) => t.type === 'CASH' && t.comments?.includes('collected'));
          const initialPaid = checkoutTx ? checkoutTx.amount : 0;
          const diff = initialPaid - totalCost;
          paymentItems.push({ label: 'Efectivo Recibido', value: `RD$ ${initialPaid.toFixed(2)}` });
          if (diff > 0) {
            paymentItems.push({ label: 'Reembolso Pendiente', value: `RD$ ${diff.toFixed(2)} (Depósito)` });
          } else if (diff < 0) {
            paymentItems.push({ label: 'Cobrar Diferencia', value: `RD$ ${Math.abs(diff).toFixed(2)}` });
          } else {
            paymentItems.push({ label: 'Estado', value: 'Saldado en Efectivo' });
          }
        } else {
          paymentItems.push({ label: 'Cargo a Tarjeta', value: `RD$ ${totalCost.toFixed(2)}` });
        }
        
        this.drawLabelValueGrid(doc, 45, paymentY + 15, paymentItems);

        // 8. Notes & Signature
        const notesY = paymentY + 65;
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('NOTAS', 45, notesY);
        doc.font('Helvetica').fontSize(7.5).fillColor('#4B5563');
        doc.text(
          'Este recibo sirve como comprobante de devolución y conciliación de la transacción. Todos los cargos finales han sido procesados de acuerdo con el estado de la inspección del vehículo.',
          45, notesY + 15, { width: 260, align: 'justify' }
        );

        // Signature on the right
        this.drawSignatureSection(doc, 45, paymentY + 15, 505.28, returnSigBuf, rental.customer?.name || 'Firma del Cliente');

        // Footer page number 1
        this.drawFooterPageNumber(doc, 1);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
