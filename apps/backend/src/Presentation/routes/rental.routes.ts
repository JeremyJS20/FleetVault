import { Router } from 'express';
import { RentalService } from '../../Application/services/rental.service.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateRentalSchema, ReturnRentalSchema } from '@rent-car/common';
import { prisma } from '../../Infrastructure/db.js';

const router = Router();
const service = new RentalService();

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
        const { signatureUrl } = req.body;
        const resolvedEmployeeId = await resolveEmployeeId(req.user!.userId);
        const result = await service.activateReservation(rentalId, {
          signatureUrl,
          checkoutEmployeeId: resolvedEmployeeId
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
          pricePerDay: Number(req.body.pricePerDay),
          checkoutOdometer: req.body.checkoutOdometer ? Number(req.body.checkoutOdometer) : undefined,
          checkoutFuelLevel: req.body.checkoutFuelLevel,
          signatureUrl: req.body.signatureUrl,
          comments: req.body.comments,
          stripePaymentMethodId: req.body.stripePaymentMethodId,
          hasScratches: req.body.hasScratches,
          hasBrokenGlass: req.body.hasBrokenGlass,
          missingSpareTire: req.body.missingSpareTire,
          missingJack: req.body.missingJack,
          tireConditionFrontLeft: req.body.tireConditionFrontLeft,
          tireConditionFrontRight: req.body.tireConditionFrontRight,
          tireConditionRearLeft: req.body.tireConditionRearLeft,
          tireConditionRearRight: req.body.tireConditionRearRight,
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
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
