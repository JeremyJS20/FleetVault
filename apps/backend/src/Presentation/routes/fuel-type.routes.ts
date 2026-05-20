import { Router } from 'express';
import { CatalogService } from '../../Application/services/catalog.service.js';
import { authMiddleware } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateFuelTypeSchema, UpdateFuelTypeSchema } from '@rent-car/common';

const router = Router();
const service = new CatalogService();

// GET /api/fuel-types
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const search = req.query.search?.toString();
    const status = req.query.status?.toString();
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await service.listFuelTypes({ search, status, page, limit });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/fuel-types/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await service.getFuelTypeById(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// POST /api/fuel-types
router.post('/', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(CreateFuelTypeSchema), async (req, res, next) => {
  try {
    const item = await service.createFuelType(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PUT /api/fuel-types/:id
router.put('/:id', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(UpdateFuelTypeSchema), async (req, res, next) => {
  try {
    const item = await service.updateFuelType(req.params.id, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/fuel-types/:id/status
router.patch('/:id/status', authMiddleware, requireRole(['ADMINISTRATOR']), async (req, res, next) => {
  try {
    const item = await service.toggleFuelTypeStatus(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

export default router;
