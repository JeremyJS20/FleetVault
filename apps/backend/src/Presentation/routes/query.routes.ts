import { Router } from 'express';
import { prisma } from '../../Infrastructure/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateQuery } from '../../Application/middleware/validation.middleware.js';
import { z } from 'zod';

const router = Router();

const SearchRentalsQuerySchema = z.object({
  status: z.string().optional(),
  customerId: z.string().optional(),
  vehicleId: z.string().optional(),
  brandId: z.string().optional(),
  modelId: z.string().optional(),
  vehicleTypeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().default('1').transform((val) => {
    const num = parseInt(val, 10);
    return isNaN(num) || num <= 0 ? 1 : num;
  }),
  limit: z.string().optional().default('10').transform((val) => {
    const num = parseInt(val, 10);
    return isNaN(num) || num <= 0 ? 10 : num;
  }),
});

router.get(
  '/search',
  authMiddleware,
  requireRole(['ADMINISTRATOR', 'AGENT']),
  validateQuery(SearchRentalsQuerySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        status,
        customerId,
        vehicleId,
        brandId,
        modelId,
        vehicleTypeId,
        startDate,
        endDate,
        search,
        page,
        limit,
      } = req.query as unknown as z.infer<typeof SearchRentalsQuerySchema>;

      const where: any = {};

      if (status) {
        where.status = status;
      }
      if (customerId) {
        where.customerId = customerId;
      }
      if (vehicleId) {
        where.vehicleId = vehicleId;
      }

      // Nested vehicle conditions
      if (brandId || modelId || vehicleTypeId) {
        where.vehicle = {};
        if (brandId) where.vehicle.brandId = brandId;
        if (modelId) where.vehicle.modelId = modelId;
        if (vehicleTypeId) where.vehicle.vehicleTypeId = vehicleTypeId;
      }

      // Date range filters
      if (startDate || endDate) {
        where.rentalDate = {};
        if (startDate) {
          const start = new Date(startDate);
          if (!isNaN(start.getTime())) {
            where.rentalDate.gte = start;
          }
        }
        if (endDate) {
          const end = new Date(endDate);
          if (!isNaN(end.getTime())) {
            where.rentalDate.lte = end;
          }
        }
      }

      // Search keyword filter
      if (search && search.trim() !== '') {
        const queryStr = search.trim();
        where.OR = [
          { driverName: { contains: queryStr } },
          { purchaseOrderNumber: { contains: queryStr } },
          { customer: { name: { contains: queryStr } } },
          { vehicle: { plateNumber: { contains: queryStr } } },
          { vehicle: { chassisNumber: { contains: queryStr } } },
          { checkoutEmployee: { name: { contains: queryStr } } },
        ];
      }

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.rental.findMany({
          where,
          skip,
          take: limit,
          include: {
            vehicle: {
              include: {
                brand: true,
                model: true,
                vehicleType: true,
              },
            },
            customer: true,
            checkoutEmployee: true,
            returnEmployee: true,
          },
          orderBy: {
            rentalDate: 'desc',
          },
        }),
        prisma.rental.count({ where }),
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
