import { Router } from 'express';
import { prisma } from '../../Infrastructure/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateQuery } from '../../Application/middleware/validation.middleware.js';
import { z } from 'zod';

const router = Router();

// GET /api/transactions/me — customer's own transactions
router.get(
  '/me',
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user!.userId } });
      if (!customer) return res.status(404).json({ success: false, error: 'Customer profile not found' });

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string, 10) || 10));
      const skip = (page - 1) * limit;

      const rentals = await prisma.rental.findMany({
        where: { customerId: customer.id },
        select: { id: true },
      });
      const rentalIds = rentals.map((r) => r.id);

      const where = { rentalId: { in: rentalIds } };

      const [items, total] = await Promise.all([
        prisma.transactionLedger.findMany({
          where,
          skip,
          take: limit,
          include: {
            rental: {
              select: {
                id: true,
                status: true,
                totalCost: true,
                rentalDate: true,
                scheduledReturnDate: true,
                vehicle: { select: { plateNumber: true, vehicleType: { select: { name: true } } } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.transactionLedger.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: { items, total, page, limit, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

const SearchTransactionsQuerySchema = z.object({
  type: z.string().optional(),
  customerId: z.string().optional(),
  rentalId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().default('1').transform((val) => {
    const num = parseInt(val, 10);
    return isNaN(num) || num <= 0 ? 1 : num;
  }),
  limit: z.string().optional().default('20').transform((val) => {
    const num = parseInt(val, 10);
    return isNaN(num) || num <= 0 ? 20 : num;
  }),
});

router.get(
  '/',
  authMiddleware,
  requireRole(['ADMINISTRATOR', 'AGENT']),
  validateQuery(SearchTransactionsQuerySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        type,
        customerId,
        rentalId,
        startDate,
        endDate,
        search,
        page,
        limit,
      } = req.query as unknown as z.infer<typeof SearchTransactionsQuerySchema>;

      const where: any = {};

      if (type) where.type = type;
      if (rentalId) where.rentalId = rentalId;

      if (customerId || (search && search.trim() !== '')) {
        where.rental = {};
        if (customerId) where.rental.customerId = customerId;
        if (search && search.trim() !== '') {
          const queryStr = search.trim();
          where.rental.customer = {
            name: { contains: queryStr }
          };
        }
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) where.createdAt.gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) where.createdAt.lte = end;
        }
      }

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.transactionLedger.findMany({
          where,
          skip,
          take: limit,
          include: {
            rental: {
              include: {
                customer: { select: { id: true, name: true, nationalId: true } },
                vehicle: { select: { plateNumber: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.transactionLedger.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          items,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
