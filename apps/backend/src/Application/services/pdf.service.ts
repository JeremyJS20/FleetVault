import PDFDocument from 'pdfkit';
import { put, get } from '@vercel/blob';

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

  async generateContractPdf(rental: any): Promise<string> {
    const sigBuf = await this.fetchImageBuffer(rental.signatureUrl);
    const returnSigBuf = await this.fetchImageBuffer(rental.returnSignatureUrl);
    const licensePhotoBuf = await this.fetchImageBuffer(rental.driverLicensePhotoUrl);

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

        const maxY = doc.page.height - 70;

        // ── HEADER ──
        doc.fontSize(20).text('FLEETVAULT RENTAL CONTRACT', { align: 'center', underline: true });
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#555').text(`Contract Reference: ${rental.id}`, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.fillColor('#000');
        doc.moveDown(0.5);

        // Status badge
        const statusColor = rental.status === 'COMPLETED' ? '#22c55e' : rental.status === 'ACTIVE' ? '#3b82f6' : '#eab308';
        doc.fontSize(10).fillColor(statusColor).text(`Status: ${rental.status}`, { align: 'center' });
        doc.fillColor('#000');
        doc.moveDown();

        // ── SECTION: CUSTOMER & DRIVER INFO ──
        doc.fontSize(13).text('1. CUSTOMER & DRIVER INFORMATION', { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(9).text(`Customer Name: ${rental.customer?.name || 'N/A'}`);
        doc.text(`National ID / RNC: ${rental.customer?.nationalId || 'N/A'}`);
        doc.text(`Customer Type: ${rental.customer?.type || 'INDIVIDUAL'}`);
        doc.text(`Address: ${rental.customer?.address || 'N/A'}`);
        doc.text(`Phone: ${rental.customer?.phone || 'N/A'}`);
        doc.text(`Email: ${rental.customer?.email || 'N/A'}`);
        doc.moveDown(0.3);
        doc.text(`Driver Name: ${rental.driverName || rental.customer?.name || 'N/A'}`);
        doc.text(`Driver License #: ${rental.driverLicenseNumber || rental.customer?.licenseNumber || 'N/A'}`);
        doc.text(`License Country: ${rental.driverLicenseCountry || rental.customer?.licenseCountry || 'N/A'}`);
        if (rental.driverLicenseExpDate) {
          doc.text(`License Expiration: ${new Date(rental.driverLicenseExpDate).toLocaleDateString()}`);
        }
        doc.moveDown();

        // Driver license photo inline
        if (licensePhotoBuf) {
          try {
            doc.fontSize(9).text('Driver License Photo:', { underline: true });
            doc.moveDown(0.2);
            doc.image(licensePhotoBuf, { fit: [160, 110], align: 'left' });
            doc.moveDown(1);
          } catch {
            doc.fontSize(8).fillColor('#999').text('(License photo could not be embedded)').fillColor('#000');
            doc.moveDown();
          }
        }

        // ── SECTION: VEHICLE DETAILS ──
        doc.fontSize(13).text('2. VEHICLE DETAILS', { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(9).text(`Vehicle: ${rental.vehicle?.brand?.name || ''} ${rental.vehicle?.model?.name || 'N/A'}`);
        doc.text(`Plate Number: ${rental.vehicle?.plateNumber || 'N/A'}`);
        doc.text(`Chassis (VIN): ${rental.vehicle?.chassisNumber || 'N/A'}`);
        doc.text(`Engine Number: ${rental.vehicle?.engineNumber || 'N/A'}`);
        doc.text(`Vehicle Type: ${rental.vehicle?.vehicleType?.name || 'N/A'}`);
        doc.text(`Color: ${rental.vehicle?.color || 'N/A'}`);
        doc.text(`Year: ${rental.vehicle?.year || 'N/A'}`);
        doc.moveDown();

        // ── SECTION: RENTAL PERIOD & EMPLOYEES ──
        doc.fontSize(13).text('3. RENTAL PERIOD & STAFF', { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(9).text(`Checkout Date: ${new Date(rental.rentalDate).toLocaleString()}`);
        doc.text(`Scheduled Return: ${new Date(rental.scheduledReturnDate).toLocaleString()}`);
        if (rental.actualReturnDate) {
          doc.text(`Actual Return: ${new Date(rental.actualReturnDate).toLocaleString()}`);
        }
        doc.moveDown(0.3);
        doc.text(`Checked Out By: ${rental.checkoutEmployee?.name || 'N/A'}`);
        if (rental.returnEmployee) {
          doc.text(`Returned To: ${rental.returnEmployee?.name || 'N/A'}`);
        }
        doc.moveDown();

        // ── SECTION: CHECKOUT CONDITION ──
        doc.fontSize(13).text('4. CHECKOUT CONDITION', { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(9).text(`Odometer: ${rental.checkoutOdometer} km`);
        doc.text(`Fuel Level: ${rental.checkoutFuelLevel || 'N/A'}`);
        doc.moveDown();

        // Checkout inspection
        const checkoutInspection = rental.inspections?.find((i: any) => i.type === 'CHECKOUT');
        if (checkoutInspection) {
          doc.fontSize(10).text('Checkout Inspection Report:', { underline: true });
          doc.moveDown(0.2);
          doc.fontSize(9).text(`Inspector: ${checkoutInspection.employee?.name || 'N/A'}`);
          doc.text(`Tires (FL/FR/RL/RR): ${checkoutInspection.tireConditionFrontLeft || 'OK'} / ${checkoutInspection.tireConditionFrontRight || 'OK'} / ${checkoutInspection.tireConditionRearLeft || 'OK'} / ${checkoutInspection.tireConditionRearRight || 'OK'}`);
          doc.text(`Broken Glass: ${checkoutInspection.hasBrokenGlass ? 'YES' : 'No'}`);
          doc.text(`Scratches: ${checkoutInspection.hasScratches ? 'YES' : 'No'}`);
          doc.text(`Missing Spare Tire: ${checkoutInspection.missingSpareTire ? 'YES' : 'No'}`);
          doc.text(`Missing Jack: ${checkoutInspection.missingJack ? 'YES' : 'No'}`);
          doc.text(`Odometer: ${checkoutInspection.odometer} km`);
          if (checkoutInspection.comments) doc.text(`Comments: ${checkoutInspection.comments}`);
        } else {
          doc.fontSize(9).fillColor('#999').text('(No checkout inspection recorded)').fillColor('#000');
        }
        doc.moveDown();

        // ── SECTION: RETURN CONDITION (if returned) ──
        if (rental.status === 'COMPLETED' && rental.actualReturnDate) {
          doc.fontSize(13).text('5. RETURN CONDITION', { underline: true });
          doc.moveDown(0.4);
          doc.fontSize(9).text(`Return Odometer: ${rental.returnOdometer || 'N/A'} km`);
          doc.text(`Return Fuel Level: ${rental.returnFuelLevel || 'N/A'}`);
          doc.moveDown();

          const returnInspection = rental.inspections?.find((i: any) => i.type === 'RETURN');
          if (returnInspection) {
            doc.fontSize(10).text('Return Inspection Report:', { underline: true });
            doc.moveDown(0.2);
            doc.fontSize(9).text(`Inspector: ${returnInspection.employee?.name || 'N/A'}`);
            doc.text(`Tires (FL/FR/RL/RR): ${returnInspection.tireConditionFrontLeft || 'OK'} / ${returnInspection.tireConditionFrontRight || 'OK'} / ${returnInspection.tireConditionRearLeft || 'OK'} / ${returnInspection.tireConditionRearRight || 'OK'}`);
            doc.text(`Broken Glass: ${returnInspection.hasBrokenGlass ? 'YES' : 'No'}`);
            doc.text(`Scratches: ${returnInspection.hasScratches ? 'YES' : 'No'}`);
            doc.text(`Missing Spare Tire: ${returnInspection.missingSpareTire ? 'YES' : 'No'}`);
            doc.text(`Missing Jack: ${returnInspection.missingJack ? 'YES' : 'No'}`);
            doc.text(`Odometer: ${returnInspection.odometer} km`);
            if (returnInspection.comments) doc.text(`Comments: ${returnInspection.comments}`);
          } else {
            doc.fontSize(9).fillColor('#999').text('(No return inspection recorded)').fillColor('#000');
          }
          doc.moveDown();
        }

        // ── SECTION: PRICING & TRANSACTIONS ──
        const sectionLabel = rental.status === 'COMPLETED' ? '6. CHARGES & PAYMENTS' : '6. PRICING';
        doc.fontSize(13).text(sectionLabel, { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(9).text(`Daily Rate: RD$${rental.pricePerDay.toFixed(2)}`);
        const rentalDays = Math.ceil((new Date(rental.actualReturnDate || rental.scheduledReturnDate).getTime() - new Date(rental.rentalDate).getTime()) / (1000 * 60 * 60 * 24)) || 1;
        doc.text(`Rental Days: ${rentalDays}`);
        doc.text(`Base Cost (${rentalDays} × RD$${rental.pricePerDay.toFixed(2)}): RD$${(rentalDays * rental.pricePerDay).toFixed(2)}`);

        if (rental.transactions?.length > 0) {
          doc.moveDown(0.3);
          doc.fontSize(10).text('Transaction History:', { underline: true });
          doc.moveDown(0.2);
          for (const tx of rental.transactions) {
            doc.fontSize(9).text(`${tx.type} — RD$${tx.amount.toFixed(2)} ${tx.comments ? `— ${tx.comments}` : ''}`);
          }
        }

        if (rental.totalCost) {
          doc.moveDown(0.3);
          doc.fontSize(11).text(`TOTAL AMOUNT: RD$${rental.totalCost.toFixed(2)}`);
        }
        if (rental.commissionAmount) {
          doc.text(`Agent Commission: RD$${rental.commissionAmount.toFixed(2)}`);
        }
        if (rental.purchaseOrderNumber) {
          doc.text(`Purchase Order (PO): ${rental.purchaseOrderNumber}`);
        }
        if (rental.stripePaymentIntentId) {
          doc.text(`Payment (Stripe): ${rental.stripePaymentIntentId}`);
        }
        if (rental.comments) {
          doc.moveDown(0.3);
          doc.text(`Comments: ${rental.comments}`);
        }
        doc.moveDown();

        // ── SECTION: SIGNATURES ──
        doc.fontSize(13).text('7. SIGNATURES', { underline: true });
        doc.moveDown(0.4);

        // Checkout signature
        if (sigBuf) {
          try {
            doc.fontSize(10).text('Customer Signature (Checkout):');
            doc.moveDown(0.2);
            doc.image(sigBuf, { fit: [150, 60], align: 'left' });
            doc.moveDown(1.5);
          } catch {
            doc.fontSize(8).fillColor('#999').text('(Checkout signature could not be rendered)').fillColor('#000');
            doc.moveDown();
          }
        } else {
          doc.fontSize(9).fillColor('#999').text('(No checkout signature captured)').fillColor('#000');
          doc.moveDown();
        }

        // Return signature
        if (returnSigBuf) {
          try {
            doc.fontSize(10).text('Customer Signature (Return):');
            doc.moveDown(0.2);
            doc.image(returnSigBuf, { fit: [150, 60], align: 'left' });
            doc.moveDown(1.5);
          } catch {
            doc.fontSize(8).fillColor('#999').text('(Return signature could not be rendered)').fillColor('#000');
            doc.moveDown();
          }
        } else if (rental.status === 'COMPLETED') {
          doc.fontSize(9).fillColor('#999').text('(No return signature captured)').fillColor('#000');
          doc.moveDown();
        }

        // ── SECTION: TERMS ──
        if (doc.y > maxY - 80) doc.addPage();
        doc.fontSize(13).text('8. TERMS & CONDITIONS', { underline: true });
        doc.moveDown(0.4);
        doc.fontSize(8).text(
          '1. The customer acknowledges receiving the vehicle in good condition as described in the checkout inspection.\n\n' +
          '2. The customer agrees to return the vehicle on or before the scheduled return date. Late returns will incur penalties as per FleetVault policies.\n\n' +
          '3. The customer is responsible for any damage, loss, or theft of the vehicle during the rental period, including tires, rims, and accessories.\n\n' +
          '4. Fuel difference surcharges apply if the vehicle is returned with less fuel than at checkout, charged at market rate plus service fee.\n\n' +
          '5. All penalties, surcharges, and fees are itemized in the Charges section above.\n\n' +
          '6. The customer authorizes FleetVault to process charges for any outstanding amounts, including damage fees identified post-return.\n\n' +
          '7. This contract is governed by the laws of the Dominican Republic.',
          { align: 'justify' }
        );
        doc.moveDown();

        doc.fontSize(10).text('Thank you for choosing FleetVault!', { align: 'center', oblique: true });

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
}
