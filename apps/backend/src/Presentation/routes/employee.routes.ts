import { Router } from 'express';
import { CatalogService } from '../../Application/services/catalog.service.js';
import { authMiddleware } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateEmployeeSchema, UpdateEmployeeSchema } from '@rent-car/common';

const router = Router();
const service = new CatalogService();

// GET /api/employees
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const search = req.query.search?.toString();
    const status = req.query.status?.toString();
    const shift = req.query.shift?.toString();
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await service.listEmployees({ search, status, shift, page, limit });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/employees/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await service.getEmployeeById(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// POST /api/employees
router.post('/', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(CreateEmployeeSchema), async (req, res, next) => {
  try {
    const item = await service.createEmployee(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PUT /api/employees/:id
router.put('/:id', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(UpdateEmployeeSchema), async (req, res, next) => {
  try {
    const item = await service.updateEmployee(req.params.id, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/employees/:id/status
router.patch('/:id/status', authMiddleware, requireRole(['ADMINISTRATOR']), async (req, res, next) => {
  try {
    const item = await service.toggleEmployeeStatus(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

export default router;
