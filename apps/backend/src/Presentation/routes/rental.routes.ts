import { Router } from 'express';
import { RentalService } from '../../Application/services/rental.service.js';
import { PdfService } from '../../Application/services/pdf.service.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateRentalSchema, ReturnRentalSchema } from '@rent-car/common';
import { prisma } from '../../Infrastructure/db.js';
import { get } from '@vercel/blob';

const router = Router();
const service = new RentalService();
const pdfService = new PdfService();

async function resolveEmployeeId(userId: string): Promise<string> {
  const employee = await prisma.employee.findFirst({ where: { userId } });
  if (!employee) throw new Error('Authenticated user is not linked to an employee record');
  return employee.id;
}

// GET /api/rentals
router.get(
  '/',
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const status = req.query.status?.toString();
      const customerId = req.query.customerId?.toString();
      const checkoutEmployeeId = req.query.checkoutEmployeeId?.toString();
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const result = await service.listRentals({ status, customerId, checkoutEmployeeId, page, limit });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/rentals/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await service.getRentalById(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/rentals (checkout/activate or create walk-in)
router.post(
  '/',
  authMiddleware,
  requireRole(['AGENT', 'ADMINISTRATOR']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { rentalId } = req.body;
      if (rentalId) {
        // Activate reservation checkout
        const { signatureUrl, driverName, driverLicenseNumber, driverLicenseCountry, driverLicenseExpDate, driverLicensePhotoUrl } = req.body;
        const resolvedEmployeeId = await resolveEmployeeId(req.user!.userId);
        const result = await service.activateReservation(rentalId, {
          signatureUrl,
          checkoutEmployeeId: resolvedEmployeeId,
          driverName,
          driverLicenseNumber,
          driverLicenseCountry,
          driverLicenseExpDate,
          driverLicensePhotoUrl,
        });
        res.status(200).json({ success: true, data: result });
      } else {
        // Direct counter checkout
        const walkinEmployeeId = await resolveEmployeeId(req.user!.userId);
        const result = await service.createWalkInRental({
          customerId: req.body.customerId,
          checkoutEmployeeId: walkinEmployeeId,
          vehicleId: req.body.vehicleId,
          rentalDate: req.body.rentalDate,
          scheduledReturnDate: req.body.scheduledReturnDate,
          pricePerDay: req.body.pricePerDay ? Number(req.body.pricePerDay) : undefined,
          driverName: req.body.driverName,
          driverLicenseNumber: req.body.driverLicenseNumber,
          driverLicenseCountry: req.body.driverLicenseCountry,
          driverLicenseExpDate: req.body.driverLicenseExpDate,
          driverLicensePhotoUrl: req.body.driverLicensePhotoUrl,
          checkoutOdometer: req.body.checkoutOdometer ? Number(req.body.checkoutOdometer) : undefined,
          checkoutFuelLevel: req.body.checkoutFuelLevel,
          signatureUrl: req.body.signatureUrl,
          comments: req.body.comments,
          stripePaymentMethodId: req.body.stripePaymentMethodId,
          paymentMethod: req.body.paymentMethod,
          purchaseOrderNumber: req.body.purchaseOrderNumber,
          damages: req.body.damages,
          photoUrls: req.body.photoUrls,
          inspectionComments: req.body.inspectionComments
        });
        res.status(201).json({ success: true, data: result });
      }
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/rentals/:id/return-estimate
router.post(
  '/:id/return-estimate',
  authMiddleware,
  requireRole(['INSPECTOR', 'AGENT', 'ADMINISTRATOR']),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await service.calculatePenalties(req.params.id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/rentals/:id/return
router.post(
  '/:id/return',
  authMiddleware,
  requireRole(['INSPECTOR', 'AGENT', 'ADMINISTRATOR']),
  validateBody(ReturnRentalSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const returnEmployeeId = await resolveEmployeeId(req.user!.userId);
      const result = await service.processReturn(req.params.id, { ...req.body, returnEmployeeId });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/rentals/:id
router.put('/:id', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await service.updateRental(req.params.id, {
      signatureUrl: req.body.signatureUrl,
      driverLicensePhotoUrl: req.body.driverLicensePhotoUrl,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/rentals/:id/contract — generate or serve contract PDF on demand
router.get('/:id/contract', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rental = await prisma.rental.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: {
          include: {
            brand: true,
            model: true,
            vehicleType: true
          }
        },
        customer: { include: { user: { select: { email: true } } } },
        checkoutEmployee: true,
        returnEmployee: true,
        inspections: {
          include: {
            employee: true,
            damages: { include: { damageType: true } }
          }
        },
        transactions: true
      }
    });

    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }

    let pdfUrl = rental.contractPdfUrl;

    let localBuffer: Buffer | null = null;

    if (!pdfUrl) {
      const result = await pdfService.generateContractPdf(rental);
      pdfUrl = result.url;
      localBuffer = result.buffer;
      if (pdfUrl) {
        await prisma.rental.update({
          where: { id: rental.id },
          data: { contractPdfUrl: pdfUrl }
        });
      }
    }

    if (localBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract_${rental.id.slice(0, 8)}.pdf"`);
      res.setHeader('Content-Length', localBuffer.length);
      return res.send(localBuffer);
    }

    let blobBuffer: Buffer | null = null;
    try {
      const result = await get(pdfUrl!, {
        access: 'private',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (result && result.statusCode === 200) {
        const reader = result.stream.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        blobBuffer = Buffer.concat(chunks);
      }
    } catch { /* blob fetch failed, will regenerate below */ }

    if (!blobBuffer) {
      const fallback = await pdfService.generateContractPdf(rental);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract_${rental.id.slice(0, 8)}.pdf"`);
      res.setHeader('Content-Length', fallback.buffer.length);
      return res.send(fallback.buffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Contract_${rental.id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', blobBuffer.length);
    res.send(blobBuffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/rentals/:id/receipt — serve or generate return receipt PDF on demand
router.get('/:id/receipt', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rental = await prisma.rental.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: {
          include: {
            brand: true,
            model: true,
            vehicleType: true
          }
        },
        customer: { include: { user: { select: { email: true } } } },
        checkoutEmployee: true,
        returnEmployee: true,
        inspections: {
          include: {
            employee: true,
            damages: { include: { damageType: true } }
          }
        },
        transactions: true
      }
    });

    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }

    let pdfUrl = rental.returnReceiptUrl;

    let localBuffer: Buffer | null = null;

    if (!pdfUrl) {
      const result = await pdfService.generateReturnReceiptPdf(rental);
      pdfUrl = result.url;
      localBuffer = result.buffer;
      if (pdfUrl) {
        await prisma.rental.update({
          where: { id: rental.id },
          data: { returnReceiptUrl: pdfUrl }
        });
      }
    }

    if (localBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Receipt_${rental.id.slice(0, 8)}.pdf"`);
      res.setHeader('Content-Length', localBuffer.length);
      return res.send(localBuffer);
    }

    let blobBuffer: Buffer | null = null;
    try {
      const result = await get(pdfUrl!, {
        access: 'private',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (result && result.statusCode === 200) {
        const reader = result.stream.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        blobBuffer = Buffer.concat(chunks);
      }
    } catch { /* blob fetch failed, will regenerate below */ }

    if (!blobBuffer) {
      const fallback = await pdfService.generateReturnReceiptPdf(rental);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Receipt_${rental.id.slice(0, 8)}.pdf"`);
      res.setHeader('Content-Length', fallback.buffer.length);
      return res.send(fallback.buffer);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Receipt_${rental.id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', blobBuffer.length);
    res.send(blobBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
