import { Router } from 'express';
import { InspectionService } from '../../Application/services/inspection.service.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateInspectionSchema } from '@rent-car/common';
import { prisma } from '../../Infrastructure/db.js';

const router = Router();
const service = new InspectionService();

async function resolveEmployeeId(userId: string): Promise<string> {
  const employee = await prisma.employee.findFirst({ where: { userId } });
  if (!employee) throw new Error('Authenticated user is not linked to an employee record');
  return employee.id;
}

// POST /api/inspections
router.post(
  '/',
  authMiddleware,
  requireRole(['INSPECTOR', 'AGENT', 'ADMINISTRATOR']),
  validateBody(CreateInspectionSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const employeeId = req.body.employeeId || await resolveEmployeeId(req.user!.userId);
      const result = await service.createInspection({
        ...req.body,
        employeeId,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/inspections
router.get(
  '/',
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const vehicleId = req.query.vehicleId?.toString();
      const customerId = req.query.customerId?.toString();
      const employeeId = req.query.employeeId?.toString();
      const search = req.query.search?.toString();
      const type = req.query.type?.toString();
      const status = req.query.status?.toString();
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const result = await service.listInspections({ vehicleId, customerId, employeeId, search, type, status, page, limit });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/inspections/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const result = await service.getInspectionById(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
