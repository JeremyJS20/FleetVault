import { Router } from 'express';
import { CatalogService } from '../../Application/services/catalog.service.js';
import { authMiddleware } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateVehicleSchema, UpdateVehicleSchema, CleaningStatus } from '@rent-car/common';
import { z } from 'zod';

const router = Router();
const service = new CatalogService();

// GET /api/vehicles
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const search = req.query.search?.toString();
    const status = req.query.status?.toString();
    const cleaningStatus = req.query.cleaningStatus?.toString();
    const vehicleTypeId = req.query.vehicleTypeId?.toString();
    const brandId = req.query.brandId?.toString();
    const modelId = req.query.modelId?.toString();
    const fuelTypeId = req.query.fuelTypeId?.toString();
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await service.listVehicles({
      search,
      status,
      cleaningStatus,
      vehicleTypeId,
      brandId,
      modelId,
      fuelTypeId,
      page,
      limit
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/vehicles/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await service.getVehicleById(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// POST /api/vehicles
router.post('/', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(CreateVehicleSchema), async (req, res, next) => {
  try {
    const item = await service.createVehicle(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PUT /api/vehicles/:id
router.put('/:id', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(UpdateVehicleSchema), async (req, res, next) => {
  try {
    const item = await service.updateVehicle(req.params.id, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/vehicles/:id/status
router.patch('/:id/status', authMiddleware, requireRole(['ADMINISTRATOR']), async (req, res, next) => {
  try {
    const item = await service.toggleVehicleStatus(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/vehicles/:id/cleaning
const CleaningStatusBodySchema = z.object({
  cleaningStatus: z.enum(CleaningStatus)
});

router.patch('/:id/cleaning', authMiddleware, requireRole(['INSPECTOR', 'ADMINISTRATOR']), validateBody(CleaningStatusBodySchema), async (req, res, next) => {
  try {
    const item = await service.updateVehicleCleaning(req.params.id, req.body.cleaningStatus);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/vehicles/:id/pass-inspection
router.patch('/:id/pass-inspection', authMiddleware, requireRole(['INSPECTOR', 'ADMINISTRATOR']), async (req, res, next) => {
  try {
    const item = await service.passInspection(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

export default router;
