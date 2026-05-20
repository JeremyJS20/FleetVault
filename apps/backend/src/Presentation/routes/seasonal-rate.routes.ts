import { Router } from 'express';
import { CatalogService } from '../../Application/services/catalog.service.js';
import { authMiddleware } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateSeasonalRateSchema, UpdateSeasonalRateSchema } from '@rent-car/common';

const router = Router();
const service = new CatalogService();

// GET /api/seasonal-rates
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const search = req.query.search?.toString();
    const status = req.query.status?.toString();
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await service.listSeasonalRates({ search, status, page, limit });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/seasonal-rates/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await service.getSeasonalRateById(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// POST /api/seasonal-rates
router.post('/', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(CreateSeasonalRateSchema), async (req, res, next) => {
  try {
    const item = await service.createSeasonalRate(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PUT /api/seasonal-rates/:id
router.put('/:id', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(UpdateSeasonalRateSchema), async (req, res, next) => {
  try {
    const item = await service.updateSeasonalRate(req.params.id, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/seasonal-rates/:id/status
router.patch('/:id/status', authMiddleware, requireRole(['ADMINISTRATOR']), async (req, res, next) => {
  try {
    const item = await service.toggleSeasonalRateStatus(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

export default router;
