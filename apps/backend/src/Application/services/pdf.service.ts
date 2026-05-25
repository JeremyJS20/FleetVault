import PDFDocument from 'pdfkit';
import { put } from '@vercel/blob';

export class PdfService {
  async generateContractPdf(rental: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
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

        // Design & Content Layout
        doc.fontSize(20).text('FLEETVAULT RENTAL CONTRACT', { align: 'center', underline: true });
        doc.moveDown();

        // Contract Header Info
        doc.fontSize(10).text(`Contract Reference ID: ${rental.id}`);
        doc.text(`Generated On: ${new Date().toLocaleString()}`);
        doc.text(`Rental Period: ${new Date(rental.rentalDate).toLocaleDateString()} to ${new Date(rental.scheduledReturnDate).toLocaleDateString()}`);
        if (rental.actualReturnDate) {
          doc.text(`Actual Return Date: ${new Date(rental.actualReturnDate).toLocaleString()}`);
        }
        doc.moveDown();

        // Customer Details
        doc.fontSize(14).text('CUSTOMER DETAILS', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Customer Name: ${rental.customer?.name}`);
        doc.text(`National ID: ${rental.customer?.nationalId || 'N/A'}`);
        doc.text(`Driver's License: ${rental.customer?.licenseNumber || 'N/A'} (${rental.customer?.licenseCountry || 'N/A'})`);
        doc.text(`Customer Type: ${rental.customer?.type || 'INDIVIDUAL'}`);
        doc.moveDown();

        // Vehicle Details
        doc.fontSize(14).text('VEHICLE DETAILS', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Brand / Model: ${rental.vehicle?.brand?.name || 'N/A'} ${rental.vehicle?.model?.name || 'N/A'}`);
        doc.text(`Plate Number: ${rental.vehicle?.plateNumber || 'N/A'}`);
        doc.text(`Chassis Number: ${rental.vehicle?.chassisNumber || 'N/A'}`);
        doc.text(`Engine Number: ${rental.vehicle?.engineNumber || 'N/A'}`);
        doc.text(`Checkout Odometer: ${rental.checkoutOdometer} km`);
        if (rental.returnOdometer) {
          doc.text(`Return Odometer: ${rental.returnOdometer} km`);
        }
        doc.moveDown();

        // Pricing & Totals
        doc.fontSize(14).text('CHARGES & BILLING', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Daily Rate: RD$${rental.pricePerDay.toFixed(2)}`);
        if (rental.totalCost) {
          doc.text(`Total Rental Cost (with penalties if any): RD$${rental.totalCost.toFixed(2)}`);
        }
        if (rental.commissionAmount) {
          doc.text(`Agent Commission: RD$${rental.commissionAmount.toFixed(2)}`);
        }
        if (rental.purchaseOrderNumber) {
          doc.text(`Purchase Order (PO): ${rental.purchaseOrderNumber}`);
        }
        doc.moveDown();

        // Signatures or legal disclaimer
        doc.fontSize(14).text('DISCLAIMER & TERMS', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(8).text(
          'By returning the vehicle, the customer agrees that the vehicle was received and returned in the conditions stated in the pickup and return inspection reports respectively. All late penalties, fuel difference surcharges, and damage fees have been itemized and billed according to FleetVault policies.',
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
}
