import { Router } from 'express';
import { ReservationService } from '../../Application/services/reservation.service.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateReservationSchema } from '@rent-car/common';

const router = Router();
const service = new ReservationService();

// POST /api/reservations
router.post(
  '/',
  authMiddleware,
  validateBody(CreateReservationSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await service.createReservation(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reservations/me
router.get(
  '/me',
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const statusFilter = req.query.status?.toString();
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string, 10) || 10));
      const result = await service.listOwnReservations(req.user!.userId, statusFilter, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/reservations/:id/cancel
router.post(
  '/:id/cancel',
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await service.cancelReservation(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
