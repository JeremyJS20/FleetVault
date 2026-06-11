import { Router } from 'express';
import { DamageTypeService } from '../../Application/services/damage-type.service.js';
import { authMiddleware } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateDamageTypeSchema, CreateDamageFeeSchema } from '@rent-car/common';

const router = Router();
const service = new DamageTypeService();

// GET /api/damage-types - list all (admin)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await service.listDamageTypes();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/damage-types/active - list active only (public)
router.get('/active', authMiddleware, async (req, res, next) => {
  try {
    const result = await service.getActiveDamageTypes();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/damage-types/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await service.getDamageTypeById(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/damage-types
router.post('/', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(CreateDamageTypeSchema), async (req, res, next) => {
  try {
    const result = await service.createDamageType(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// PUT /api/damage-types/:id
router.put('/:id', authMiddleware, requireRole(['ADMINISTRATOR']), async (req, res, next) => {
  try {
    const result = await service.updateDamageType(req.params.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/damage-types/:id/status
router.patch('/:id/status', authMiddleware, requireRole(['ADMINISTRATOR']), async (req, res, next) => {
  try {
    const result = await service.toggleDamageTypeStatus(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/damage-types/:id/fee
router.get('/:id/fee', authMiddleware, async (req, res, next) => {
  try {
    const result = await service.getDamageFee(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /api/damage-types/:id/fee
router.post('/:id/fee', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(CreateDamageFeeSchema), async (req, res, next) => {
  try {
    const result = await service.upsertDamageFee({ ...req.body, damageTypeId: req.params.id });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
