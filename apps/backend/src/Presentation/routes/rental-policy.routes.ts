import { Router } from 'express';
import { RentalPolicyService } from '../../Application/services/rental-policy.service.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateRentalPolicySchema, UpdateRentalPolicySchema } from '@rent-car/common';

const router = Router();
const service = new RentalPolicyService();

// Public: active policies only
router.get('/', async (req, res, next) => {
  try {
    const items = await service.listPolicies(true);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// Admin: all policies including inactive
router.get('/admin', authMiddleware, async (req, res, next) => {
  try {
    const items = await service.listPolicies(false);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

// Admin only: create policy
router.post('/', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(CreateRentalPolicySchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const item = await service.createPolicy(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// Public: single policy by key
router.get('/:key', async (req, res, next) => {
  try {
    const item = await service.getPolicyByKey(req.params.key);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// Admin only: update policy
router.put('/:id', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(UpdateRentalPolicySchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const item = await service.updatePolicy(req.params.id, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

export default router;
