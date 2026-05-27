import PDFDocument from 'pdfkit';
import { put, get } from '@vercel/blob';
import { prisma } from '../../Infrastructure/db.js';

export class PdfService {
  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return new Date().toLocaleDateString('es-DO');
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('es-DO');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

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

  private async loadCompanyInfo() {
    const info = await prisma.companyInfo.findFirst();
    if (!info) {
      return {
        companyName: 'FleetVault',
        rnc: 'N/A',
        address: '123 Main Street, Blue City CA',
        phone: '(809) 555-0000',
        email: 'support@fleetvault.com',
        website: 'www.fleetvault.com',
        city: 'Santo Domingo',
        logoUrl: null,
      };
    }
    return info;
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

  private drawInvoiceHeader(doc: any, title: string, subtitle: string, company?: any) {
    doc.save();
    const c = company || {};
    // 1. Draw right header background (#0D6B7A)
    doc.rect(200, 0, doc.page.width - 200, 110).fill('#0D6B7A');

    // 2. Draw slanted dark navy polygon on left (#1B2A4A)
    doc.moveTo(0, 0)
       .lineTo(240, 0)
       .lineTo(200, 110)
       .lineTo(0, 110)
       .closePath()
       .fill('#1B2A4A');

    // 3. Logo (image or text badge)
    if (c.logoUrl) {
      try {
        doc.image(c.logoUrl, 52, 37, { fit: [36, 36] });
      } catch {
        doc.circle(70, 55, 20).fill('#FFFFFF');
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(13).text('FV', 50, 48.5, { width: 40, align: 'center' });
      }
    } else {
      doc.circle(70, 55, 20).fill('#FFFFFF');
      doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(13).text('FV', 50, 48.5, { width: 40, align: 'center' });
    }

    // 4. Company Name
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14).text(c.companyName || 'FleetVault', 105, 42);
    doc.font('Helvetica').fontSize(8.5).fillColor('#CBD5E1').text(`${c.city || 'Servicios de Alquiler'}`, 105, 60);

    // 5. Contact Details (on right)
    doc.fillColor('#FFFFFF').font('Helvetica').fontSize(8.5);
    doc.text(`Email: ${c.email || 'support@fleetvault.com'}`, 380, 36, { align: 'right', width: doc.page.width - 425 });
    doc.text(`${c.address || '123 Main Street, Blue City CA'}`, 380, 52, { align: 'right', width: doc.page.width - 425 });
    const contactRight = [c.phone, c.website].filter(Boolean).join('  |  ');
    doc.text(contactRight || `${c.phone || ''}  |  ${c.website || ''}`, 380, 68, { align: 'right', width: doc.page.width - 425 });

    doc.restore();
  }

  private drawLabelValueGrid(doc: any, x: number, y: number, items: { label: string; value: string }[]) {
    doc.save();
    const labelWidth = 90;
    const valueWidth = 180;
    let currentY = y;

    items.forEach((item) => {
      const valueText = `:   ${item.value || 'N/A'}`;

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1B2A4A');
      doc.text(item.label, x, currentY, { width: labelWidth });

      const prevY = doc.y;
      doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
      doc.text(valueText, x + labelWidth, currentY, { width: valueWidth });

      currentY = Math.max(doc.y, prevY) + 2;
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

  async generateContractPdf(rental: any): Promise<{ url: string | null; buffer: Buffer }> {
    const company = await this.loadCompanyInfo();
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
            let url: string | null = null;
            if (process.env.BLOB_READ_WRITE_TOKEN) {
              const blob = await put(filename, buffer, {
                access: 'private',
                contentType: 'application/pdf',
                token: process.env.BLOB_READ_WRITE_TOKEN,
              });
              url = blob.url;
            }
            resolve({ url, buffer });
          } catch (error) {
            const buffer = Buffer.concat(chunks);
            resolve({ url: null, buffer });
          }
        });

        // 1. Draw invoice header
        const formattedDate = this.formatDate(new Date());
        this.drawInvoiceHeader(doc, 'CONTRATO DE ALQUILER FLEETVAULT', `Referencia de Contrato: ${rental.id} | Fecha: ${formattedDate}`, company);

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
        const rentalDateStr = this.formatDate(rental.rentalDate);
        const returnDateStr = this.formatDate(rental.scheduledReturnDate);
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
        const rentalDays = Math.round(
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

        // Customer Signature (right)
        this.drawSignatureSection(doc, 280, paymentY + 10, 270, sigBuf, rental.customer?.name || 'Firma del Cliente');

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
          '1. INSPECCIÓN Y ENTREGA: El cliente declara haber recibido el vehículo en buen estado general, conforme al formulario de inspección de salida firmado digitalmente. Cualquier discrepancia debe ser reportada antes de retirar el vehículo.',
          '2. DOCUMENTACIÓN Y CONDUCTOR: El conductor principal debe presentar una licencia de conducir física y vigente. Edad mínima de 21 años (25 años para vehículos de lujo). Conductores adicionales deben estar registrados en el contrato y cumplir los mismos requisitos.',
          '3. PERÍODO DE ALQUILER: El vehículo debe ser devuelto en la fecha y hora acordadas. Las extensiones deben solicitarse y autorizarse por escrito. Las devoluciones tardías sin autorización generarán un cargo por hora según la tarifa vigente, después de 1 hora de gracia.',
          '4. DEPÓSITO DE SEGURIDAD: Los clientes no corporativos están sujetos a una retención de depósito de seguridad según la tarifa vigente, liberada al devolver el vehículo sin novedades. Clientes corporativos están sujetos a verificación de límite de crédito disponible.',
          '5. RESPONSABILIDAD POR DAÑOS: El cliente es responsable por el deducible CDW según la póliza vigente y asume el costo total de daños excluidos: neumáticos, rines, parabrisas, daños inferiores, interiores y de techo, robo de objetos de valor, pérdida de llaves y grúa.',
          '6. MULTAS E INFRACCIONES: El cliente asume toda responsabilidad por multas de tránsito, infracciones, peajes y estacionamiento durante el período de alquiler. Autoriza a FleetVault a procesar estos cargos al método de pago registrado.',
          '7. COMBUSTIBLE: El vehículo se entrega con el tanque lleno y debe devolverse en el mismo estado. De lo contrario, se aplicará la tarifa de servicio vigente.',
          '8. USOS PROHIBIDOS: Queda prohibido conducir bajo efectos de alcohol o drogas, participar en competencias, transportar materiales ilegales, subarrendar, conducir fuera de carretera, o sacar el vehículo de República Dominicana.',
          '9. LÍMITE TERRITORIAL: El vehículo puede circular en todo el territorio nacional. Zonas fronterizas (Dajabón, Jimaní, Pedernales, Elías Piña) requieren autorización previa. Prohibido sacar el vehículo del país.',
          '10. CANCELACIONES: Cancelaciones con más de 48 horas de anticipación no tienen cargo. Cancelaciones tardías o no presentación generarán un cargo equivalente a un día de alquiler.',
          '11. COBERTURA CDW: Aplica solo si el conductor principal cumple con todos los requisitos de licencia, edad y documentación. El incumplimiento anula toda cobertura.',
          '12. CARGOS POSTERIORES: El cliente autoriza a FleetVault a procesar cargos adicionales por daños, multas o costos identificados hasta 15 días después de la devolución.',
          '13. FUERZA MAYOR: FleetVault no será responsable por incumplimientos debido a huracanes, desastres naturales, disturbios civiles, pandemias o eventos fuera de su control.',
          '14. LEY APLICABLE: Este contrato se rige por las leyes de la República Dominicana. Cualquier controversia será sometida a los tribunales competentes de la República Dominicana.'
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
    const company = await this.loadCompanyInfo();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 45, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const filename = `rentcar/reports/utilization-report.pdf`;
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

        const formattedDate = new Date().toLocaleDateString();
        this.drawInvoiceHeader(doc, 'REPORTE DE UTILIZACIÓN', `Generado: ${formattedDate}`, company);

        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(14).text('REPORTE DE UTILIZACIÓN', 45, 130);
        doc.fillColor('#4B5563').font('Helvetica').fontSize(8.5).text(`Generado: ${formattedDate}`, 45, 150);

        const averageRate = data.length > 0
          ? Math.round(data.reduce((acc, curr) => acc + curr.rate, 0) / data.length)
          : 0;

        this.drawLabelValueGrid(doc, 45, 175, [
          { label: 'Utilización Promedio', value: `${averageRate}%` },
          { label: 'Meses Analizados', value: String(data.length) },
        ]);

        const tableTop = 235;
        const colWidths = { month: 160, rate: 120, bar: 225 };
        const colX = {
          month: 45,
          rate: 45 + colWidths.month,
          bar: 45 + colWidths.month + colWidths.rate,
        };
        const fullWidth = colWidths.month + colWidths.rate + colWidths.bar;
        const rowHeight = 22;

        let y = tableTop;
        let currentPage = 1;

        const drawTableHeader = (yPos: number) => {
          doc.rect(45, yPos, fullWidth, rowHeight).fill('#0D6B7A');
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
          doc.text('Mes', colX.month + 8, yPos + 6, { width: colWidths.month - 16 });
          doc.text('Tasa (%)', colX.rate + 8, yPos + 6, { width: colWidths.rate - 16 });
          doc.text('Utilización', colX.bar + 8, yPos + 6, { width: colWidths.bar - 16 });
          return yPos + rowHeight;
        };

        const drawColLines = (yPos: number) => {
          doc.lineWidth(0.5).strokeColor('#E2E8F0');
          doc.moveTo(colX.rate, yPos).lineTo(colX.rate, yPos + rowHeight).stroke();
          doc.moveTo(colX.bar, yPos).lineTo(colX.bar, yPos + rowHeight).stroke();
        };

        y = drawTableHeader(y);

        for (let i = 0; i < data.length; i++) {
          if (y > doc.page.height - 60) {
            this.drawFooterPageNumber(doc, currentPage);
            currentPage++;
            this.startContinuationPage(doc, 'REPORTE DE UTILIZACIÓN (Continuación)', currentPage);
            y = 65;
            y = drawTableHeader(y);
          }

          const row = data[i];
          const bg = i % 2 === 1 ? '#F6F8FA' : '#FFFFFF';
          doc.rect(45, y, fullWidth, rowHeight).fill(bg);
          doc.lineWidth(0.5).strokeColor('#E2E8F0');
          doc.rect(45, y, fullWidth, rowHeight).stroke();
          drawColLines(y);

          doc.font('Helvetica-Bold').fontSize(8).fillColor('#1B2A4A');
          doc.text(row.month, colX.month + 8, y + 6, { width: colWidths.month - 16 });

          doc.font('Helvetica').fontSize(8).fillColor('#4B5563');
          doc.text(`${row.rate}%`, colX.rate + 8, y + 6, { width: colWidths.rate - 16 });

          const barWidth = Math.min(row.rate * 1.8, colWidths.bar - 30);
          const barColor = row.rate > 75 ? '#22c55e' : row.rate > 50 ? '#eab308' : '#ef4444';
          doc.roundedRect(colX.bar + 8, y + 5, barWidth, 12, 3).fill(barColor);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7);
          doc.text(`${row.rate}%`, colX.bar + 12, y + 6.5, { width: 40 });

          doc.fillColor('#000');
          y += rowHeight;
        }

        this.drawFooterPageNumber(doc, currentPage);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateRevenueReportPdf(data: Record<string, any>[], categories: string[]): Promise<string> {
    const company = await this.loadCompanyInfo();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 45, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const filename = `rentcar/reports/revenue-report.pdf`;
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

        const formattedDate = new Date().toLocaleDateString();
        this.drawInvoiceHeader(doc, 'REPORTE DE INGRESOS', `Generado: ${formattedDate}`, company);

        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(14).text('REPORTE DE INGRESOS', 45, 130);
        doc.fillColor('#4B5563').font('Helvetica').fontSize(8.5).text(`Generado: ${formattedDate}`, 45, 150);

        const totalRevenue = data.reduce((acc, row) => {
          const monthlySum = categories.reduce((s, cat) => s + (row[cat] || 0), 0);
          return acc + monthlySum;
        }, 0);

        this.drawLabelValueGrid(doc, 45, 175, [
          { label: 'Ingreso Total', value: `RD$ ${totalRevenue.toFixed(2)}` },
          { label: 'Categorías', value: `${categories.length} tipos de vehículo` },
          { label: 'Período', value: `${data.length} meses` },
        ]);

        const tableTop = 250;
        const fullWidth = doc.page.width - 45 - 45;
        const firstColW = 90;
        const totalColW = 90;
        const catColW = Math.max(1, (fullWidth - firstColW - totalColW) / Math.max(1, categories.length));
        const startX = 45;
        const rowHeight = 22;

        let y = tableTop;
        let currentPage = 1;

        const drawTableHeader = (yPos: number) => {
          doc.rect(startX, yPos, fullWidth, rowHeight).fill('#0D6B7A');
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
          doc.text('Mes', startX + 6, yPos + 6.5, { width: firstColW - 12 });
          let cx = startX + firstColW;
          categories.forEach((cat) => {
            doc.text(cat, cx + 4, yPos + 6.5, { width: catColW - 8, align: 'right' });
            cx += catColW;
          });
          doc.text('Total', cx + 4, yPos + 6.5, { width: totalColW - 8, align: 'right' });
          return yPos + rowHeight;
        };

        const drawColLines = (yPos: number) => {
          doc.lineWidth(0.5).strokeColor('#E2E8F0');
          let cx = startX + firstColW;
          for (let i = 0; i <= categories.length; i++) {
            doc.moveTo(cx, yPos).lineTo(cx, yPos + rowHeight).stroke();
            cx += i < categories.length ? catColW : totalColW;
          }
        };

        y = drawTableHeader(y);

        for (let i = 0; i < data.length; i++) {
          if (y > doc.page.height - 55) {
            this.drawFooterPageNumber(doc, currentPage);
            currentPage++;
            this.startContinuationPage(doc, 'REPORTE DE INGRESOS (Continuación)', currentPage);
            y = 65;
            y = drawTableHeader(y);
          }

          const row = data[i];
          const monthlySum = categories.reduce((sum, cat) => sum + (row[cat] || 0), 0);
          const bg = i % 2 === 1 ? '#F6F8FA' : '#FFFFFF';
          doc.rect(startX, y, fullWidth, rowHeight).fill(bg);
          doc.lineWidth(0.5).strokeColor('#E2E8F0');
          doc.rect(startX, y, fullWidth, rowHeight).stroke();
          drawColLines(y);

          doc.font('Helvetica-Bold').fontSize(9).fillColor('#1B2A4A');
          doc.text(row.month, startX + 6, y + 6.5, { width: firstColW - 12 });

          doc.font('Helvetica').fontSize(9).fillColor('#4B5563');
          let cx = startX + firstColW;
          categories.forEach((cat) => {
            doc.text((row[cat] || 0).toFixed(2), cx + 4, y + 6.5, { width: catColW - 8, align: 'right' });
            cx += catColW;
          });

          doc.font('Helvetica-Bold').fontSize(9).fillColor('#1B2A4A');
          doc.text(monthlySum.toFixed(2), cx + 4, y + 6.5, { width: totalColW - 8, align: 'right' });

          y += rowHeight;
        }

        // Totals row
        if (y > doc.page.height - 50) {
          this.drawFooterPageNumber(doc, currentPage);
          currentPage++;
          this.startContinuationPage(doc, 'REPORTE DE INGRESOS (Continuación)', currentPage);
          y = 65;
        }

        const totalsRowBg = '#FAF2E8';
        doc.rect(startX, y, fullWidth, rowHeight).fill(totalsRowBg);
        doc.lineWidth(0.5).strokeColor('#E2E8F0');
        doc.rect(startX, y, fullWidth, rowHeight).stroke();
        drawColLines(y);

        doc.font('Helvetica-Bold').fontSize(10).fillColor('#1B2A4A');
        doc.text('TOTAL', startX + 6, y + 6, { width: firstColW - 12 });

        doc.font('Helvetica-Bold').fontSize(10).fillColor('#1B2A4A');
        let cx = startX + firstColW;
        categories.forEach((cat) => {
          const catTotal = data.reduce((sum, r) => sum + (r[cat] || 0), 0);
          doc.text(catTotal.toFixed(2), cx + 4, y + 4, { width: catColW - 8, align: 'right' });
          cx += catColW;
        });
        doc.text(totalRevenue.toFixed(2), cx + 4, y + 4, { width: totalColW - 8, align: 'right' });

        this.drawFooterPageNumber(doc, currentPage);

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
    const company = await this.loadCompanyInfo();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 45, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const filename = `rentcar/reports/commissions-report.pdf`;
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

        const formattedDate = new Date().toLocaleDateString();
        this.drawInvoiceHeader(doc, 'REPORTE DE COMISIONES', `Generado: ${formattedDate}`, company);

        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(14).text('REPORTE DE COMISIONES', 45, 130);
        doc.fillColor('#4B5563').font('Helvetica').fontSize(8.5).text(`Generado: ${formattedDate}`, 45, 150);

        const totalCommission = data.reduce((sum, r) => sum + r.commissionAmount, 0);
        const paidCommissions = data.filter((r) => r.payoutStatus === 'PAID').reduce((sum, r) => sum + r.commissionAmount, 0);
        const unpaidCommissions = data.filter((r) => r.payoutStatus === 'UNPAID').reduce((sum, r) => sum + r.commissionAmount, 0);

        this.drawLabelValueGrid(doc, 45, 175, [
          { label: 'Total Comisiones', value: `RD$ ${totalCommission.toFixed(2)}` },
          { label: 'Pagado', value: `RD$ ${paidCommissions.toFixed(2)}` },
          { label: 'Pendiente', value: `RD$ ${unpaidCommissions.toFixed(2)}` },
          { label: 'Agentes Activos', value: String(data.length) },
        ]);

        const tableTop = 260;
        const colWidths = { employee: 160, sales: 70, commPct: 75, amount: 110, status: 90 };
        const colX = {
          employee: 45,
          sales: 45 + colWidths.employee,
          commPct: 45 + colWidths.employee + colWidths.sales,
          amount: 45 + colWidths.employee + colWidths.sales + colWidths.commPct,
          status: 45 + colWidths.employee + colWidths.sales + colWidths.commPct + colWidths.amount,
        };
        const fullWidth = colWidths.employee + colWidths.sales + colWidths.commPct + colWidths.amount + colWidths.status;
        const rowHeight = 18;

        let y = tableTop;
        let currentPage = 1;

        const drawTableHeader = (yPos: number) => {
          doc.rect(45, yPos, fullWidth, rowHeight).fill('#0D6B7A');
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
          doc.text('Empleado', colX.employee + 6, yPos + 5, { width: colWidths.employee - 12 });
          doc.text('Ventas', colX.sales + 6, yPos + 5, { width: colWidths.sales - 12, align: 'center' });
          doc.text('Comisión %', colX.commPct + 6, yPos + 5, { width: colWidths.commPct - 12, align: 'center' });
          doc.text('Monto (RD$)', colX.amount + 6, yPos + 5, { width: colWidths.amount - 12, align: 'right' });
          doc.text('Estado', colX.status + 6, yPos + 5, { width: colWidths.status - 12, align: 'center' });
          return yPos + rowHeight;
        };

        const drawColLines = (yPos: number) => {
          doc.lineWidth(0.5).strokeColor('#E2E8F0');
          doc.moveTo(colX.sales, yPos).lineTo(colX.sales, yPos + rowHeight).stroke();
          doc.moveTo(colX.commPct, yPos).lineTo(colX.commPct, yPos + rowHeight).stroke();
          doc.moveTo(colX.amount, yPos).lineTo(colX.amount, yPos + rowHeight).stroke();
          doc.moveTo(colX.status, yPos).lineTo(colX.status, yPos + rowHeight).stroke();
        };

        y = drawTableHeader(y);

        for (let i = 0; i < data.length; i++) {
          if (y > doc.page.height - 55) {
            this.drawFooterPageNumber(doc, currentPage);
            currentPage++;
            this.startContinuationPage(doc, 'REPORTE DE COMISIONES (Continuación)', currentPage);
            y = 65;
            y = drawTableHeader(y);
          }

          const row = data[i];
          const bg = i % 2 === 1 ? '#F6F8FA' : '#FFFFFF';
          doc.rect(45, y, fullWidth, rowHeight).fill(bg);
          doc.lineWidth(0.5).strokeColor('#E2E8F0');
          doc.rect(45, y, fullWidth, rowHeight).stroke();
          drawColLines(y);

          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1B2A4A');
          doc.text(row.name, colX.employee + 6, y + 5, { width: colWidths.employee - 12 });

          doc.font('Helvetica').fontSize(7.5).fillColor('#4B5563');
          doc.text(String(row.salesCount), colX.sales + 6, y + 5, { width: colWidths.sales - 12, align: 'center' });
          doc.text(`${row.commissionPercentage}%`, colX.commPct + 6, y + 5, { width: colWidths.commPct - 12, align: 'center' });
          doc.text(row.commissionAmount.toFixed(2), colX.amount + 6, y + 5, { width: colWidths.amount - 12, align: 'right' });

          const isPaid = row.payoutStatus === 'PAID';
          const statusColor = isPaid ? '#22c55e' : '#eab308';
          const statusBg = isPaid ? '#22c55e20' : '#eab30820';
          doc.roundedRect(colX.status + 8, y + 3, colWidths.status - 16, 12, 6).fill(statusBg);
          doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(7);
          doc.text(isPaid ? 'Pagado' : 'Pendiente', colX.status + 8, y + 5, { width: colWidths.status - 16, align: 'center' });

          doc.fillColor('#000');
          y += rowHeight;
        }

        // Totals row
        if (y > doc.page.height - 50) {
          this.drawFooterPageNumber(doc, currentPage);
          currentPage++;
          this.startContinuationPage(doc, 'REPORTE DE COMISIONES (Continuación)', currentPage);
          y = 65;
        }

        doc.rect(colX.amount - 80, y, fullWidth - (colX.amount - 45 - 80), rowHeight).fill('#FAF2E8');
        doc.lineWidth(0.5).strokeColor('#E2E8F0');
        doc.rect(colX.amount - 80, y, fullWidth - (colX.amount - 45 - 80), rowHeight).stroke();

        doc.font('Helvetica-Bold').fontSize(8).fillColor('#1B2A4A');
        doc.text(`Total Agentes: ${data.length}`, colX.amount - 80, y + 5, { width: colWidths.amount - 12, align: 'left' });
        doc.text(`RD$ ${totalCommission.toFixed(2)}`, colX.amount + 6, y + 5, { width: colWidths.amount - 12, align: 'right' });

        this.drawFooterPageNumber(doc, currentPage);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateReturnReceiptPdf(rental: any): Promise<{ url: string | null; buffer: Buffer }> {
    const company = await this.loadCompanyInfo();
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
            let url: string | null = null;
            if (process.env.BLOB_READ_WRITE_TOKEN) {
              const blob = await put(filename, buffer, {
                access: 'private',
                contentType: 'application/pdf',
                token: process.env.BLOB_READ_WRITE_TOKEN,
              });
              url = blob.url;
            }
            resolve({ url, buffer });
          } catch (error) {
            const buffer = Buffer.concat(chunks);
            resolve({ url: null, buffer });
          }
        });

        // 1. Draw invoice header
        const formattedDate = this.formatDate(new Date());
        this.drawInvoiceHeader(doc, 'RECIBO DE DEVOLUCIÓN FLEETVAULT', `Referencia de Contrato: ${rental.id} | Fecha: ${formattedDate}`, company);

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
          { label: 'Fecha de Devolución', value: this.formatDate(rental.scheduledReturnDate) },
          { label: 'Agente de Recibo', value: rental.returnEmployee?.name || 'N/A' }
        ]);

        // 4. Vehicle Information (Y=255)
        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('INFORMACIÓN DEL VEHÍCULO', 45, 255);
        const vehicleInfo = `${rental.vehicle?.brand?.name || ''} ${rental.vehicle?.model?.name || 'N/A'}`;
        const rentalDateStr = this.formatDate(rental.rentalDate);
        const returnDateStr = this.formatDate(rental.scheduledReturnDate);
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

        const totalCost = rental.totalCost || 0;
        const baseCost = Math.max(0, totalCost - lateFee - fuelFee - damageFee);
        const rentalDays = Math.round(baseCost / (rental.pricePerDay || 1)) || 1;

        const tableRows = [
          {
            desc: 'Cargos por Alquiler de Vehículo',
            rate: `$ ${rental.pricePerDay.toFixed(2)}`,
            qty: `${rentalDays} día${rentalDays > 1 ? 's' : ''}`,
            subtotal: `$ ${baseCost.toFixed(2)}`
          }
        ];

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
          const cashTxns = rental.transactions?.filter((t: any) => t.type === 'CASH') || [];
          const checkoutTx = cashTxns.find((t: any) => t.comments?.includes('collected') || t.comments?.includes('recibido'));
          const returnTx = cashTxns.find((t: any) => t.comments?.includes('completada'));
          const initialPaid = checkoutTx ? checkoutTx.amount : 0;
          const diff = initialPaid - totalCost;
          paymentItems.push({ label: 'Efectivo Recibido', value: `RD$ ${initialPaid.toFixed(2)}` });
          if (returnTx) {
            if (diff > 0) {
              paymentItems.push({ label: 'Efectivo Devuelto', value: `RD$ ${diff.toFixed(2)}` });
            }
            paymentItems.push({ label: 'Estado', value: 'Saldado en Efectivo' });
          } else if (diff > 0) {
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

        // Customer Signature (right)
        this.drawSignatureSection(doc, 280, paymentY + 20, 270, returnSigBuf, rental.customer?.name || 'Firma del Cliente');

        // Footer page number 1
        this.drawFooterPageNumber(doc, 1);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateRentalReportPdf(rentals: any[], filters: { startDate?: string; endDate?: string; status?: string; vehicleTypeName?: string; search?: string }): Promise<string> {
    const company = await this.loadCompanyInfo();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 45, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: any) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const filename = `rentcar/reports/rentals-report.pdf`;
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

        const formattedDate = new Date().toLocaleDateString();
        this.drawInvoiceHeader(doc, 'REPORTE DE ALQUILERES', `Generado: ${formattedDate}`, company);

        doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(14).text('REPORTE DE ALQUILERES', 45, 130);
        doc.fillColor('#4B5563').font('Helvetica').fontSize(8.5).text(`Generado: ${formattedDate}`, 45, 150);

        // Filter summary
        const filterItems: { label: string; value: string }[] = [];
        if (filters.startDate || filters.endDate) {
          filterItems.push({ label: 'Rango de Fechas', value: `${filters.startDate || '—'} a ${filters.endDate || '—'}` });
        }
        if (filters.status) {
          const statusMap: Record<string, string> = { PENDING: 'Pendiente', ACTIVE: 'Activo', COMPLETED: 'Completado' };
          filterItems.push({ label: 'Estado', value: statusMap[filters.status] || filters.status });
        }
        if (filters.vehicleTypeName) {
          filterItems.push({ label: 'Tipo de Vehículo', value: filters.vehicleTypeName });
        }
        if (filters.search) {
          filterItems.push({ label: 'Búsqueda', value: filters.search });
        }
        if (filterItems.length > 0) {
          doc.fillColor('#1B2A4A').font('Helvetica-Bold').fontSize(10).text('FILTROS APLICADOS', 45, 175);
          this.drawLabelValueGrid(doc, 45, 190, filterItems);
        }

        // Table
        const tableTop = filterItems.length > 0 ? 230 : 185;
        const colWidths = { vehicle: 130, customer: 120, dates: 110, cost: 70, status: 75 };
        const colX = {
          vehicle: 45,
          customer: 45 + colWidths.vehicle,
          dates: 45 + colWidths.vehicle + colWidths.customer,
          cost: 45 + colWidths.vehicle + colWidths.customer + colWidths.dates,
          status: 45 + colWidths.vehicle + colWidths.customer + colWidths.dates + colWidths.cost,
        };
        const fullWidth = colWidths.vehicle + colWidths.customer + colWidths.dates + colWidths.cost + colWidths.status;
        const rowHeight = 18;

        let currentPage = 1;
        let y = tableTop;

        const drawTableHeader = (yPos: number) => {
          doc.rect(45, yPos, fullWidth, rowHeight).fill('#0D6B7A');
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
          doc.text('Vehículo', colX.vehicle + 6, yPos + 5, { width: colWidths.vehicle - 12 });
          doc.text('Cliente', colX.customer + 6, yPos + 5, { width: colWidths.customer - 12 });
          doc.text('Fechas', colX.dates + 6, yPos + 5, { width: colWidths.dates - 12 });
          doc.text('Total', colX.cost + 6, yPos + 5, { width: colWidths.cost - 12, align: 'right' });
          doc.text('Estado', colX.status + 6, yPos + 5, { width: colWidths.status - 12, align: 'center' });
          return yPos + rowHeight;
        };

        // Draw header separator lines
        const drawColLines = (yPos: number) => {
          doc.lineWidth(0.5).strokeColor('#E2E8F0');
          doc.moveTo(colX.customer, yPos).lineTo(colX.customer, yPos + rowHeight).stroke();
          doc.moveTo(colX.dates, yPos).lineTo(colX.dates, yPos + rowHeight).stroke();
          doc.moveTo(colX.cost, yPos).lineTo(colX.cost, yPos + rowHeight).stroke();
          doc.moveTo(colX.status, yPos).lineTo(colX.status, yPos + rowHeight).stroke();
        };

        y = drawTableHeader(y);

        let totalSum = 0;
        for (let i = 0; i < rentals.length; i++) {
          if (y > doc.page.height - 60) {
            this.drawFooterPageNumber(doc, currentPage);
            currentPage++;
            this.startContinuationPage(doc, 'REPORTE DE ALQUILERES (Continuación)', currentPage);
            y = 65;
            y = drawTableHeader(y);
          }

          const rental = rentals[i];
          const bg = i % 2 === 1 ? '#F6F8FA' : '#FFFFFF';
          doc.rect(45, y, fullWidth, rowHeight).fill(bg);
          doc.lineWidth(0.5).strokeColor('#E2E8F0');
          doc.rect(45, y, fullWidth, rowHeight).stroke();
          drawColLines(y);

          const vehicleStr = `${rental.vehicle?.brand?.name || ''} ${rental.vehicle?.model?.name || 'N/A'}\n${rental.vehicle?.plateNumber || ''}`;
          const customerStr = rental.customer?.name || 'N/A';
          const datesStr = `${new Date(rental.rentalDate).toLocaleDateString()}\n${new Date(rental.scheduledReturnDate).toLocaleDateString()}`;
          const cost = rental.totalCost || 0;
          totalSum += cost;

          const statusMap: Record<string, string> = { PENDING: 'Pendiente', ACTIVE: 'Activo', COMPLETED: 'Completado' };
          const statusStr = statusMap[rental.status] || rental.status;

          doc.font('Helvetica-Bold').fontSize(7).fillColor('#1B2A4A');
          doc.text(vehicleStr, colX.vehicle + 6, y + 3, { width: colWidths.vehicle - 12, lineBreak: false });

          doc.font('Helvetica').fontSize(7).fillColor('#4B5563');
          doc.text(customerStr, colX.customer + 6, y + 5, { width: colWidths.customer - 12, lineBreak: false });

          doc.font('Helvetica').fontSize(6.5).fillColor('#4B5563');
          doc.text(datesStr, colX.dates + 6, y + 3, { width: colWidths.dates - 12, lineBreak: false });

          doc.font('Helvetica-Bold').fontSize(7).fillColor('#1B2A4A');
          doc.text(`RD$ ${cost.toFixed(2)}`, colX.cost + 6, y + 5, { width: colWidths.cost - 12, align: 'right', lineBreak: false });

          doc.font('Helvetica').fontSize(6.5).fillColor('#4B5563');
          doc.text(statusStr, colX.status + 6, y + 5, { width: colWidths.status - 12, align: 'center', lineBreak: false });

          y += rowHeight;
        }

        // Totals row
        if (y > doc.page.height - 50) {
          this.drawFooterPageNumber(doc, currentPage);
          currentPage++;
          this.startContinuationPage(doc, 'REPORTE DE ALQUILERES (Continuación)', currentPage);
          y = 65;
        }

        doc.rect(colX.cost - 20, y, fullWidth - (colX.cost - 45 - 20), rowHeight).fill('#FAF2E8');
        doc.lineWidth(0.5).strokeColor('#E2E8F0');
        doc.rect(colX.cost - 20, y, fullWidth - (colX.cost - 45 - 20), rowHeight).stroke();

        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1B2A4A');
        doc.text(`Total Alquileres: ${rentals.length}`, colX.cost - 20, y + 4, { width: colWidths.cost - 12, align: 'left' });
        doc.text(`RD$ ${totalSum.toFixed(2)}`, colX.cost + 6, y + 4, { width: colWidths.cost - 12, align: 'right' });

        y += rowHeight + 15;

        // Footer
        this.drawFooterPageNumber(doc, currentPage);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
