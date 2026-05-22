import { Router } from 'express';
import { FeeConfigService } from '../../Application/services/fee-config.service.js';
import { authMiddleware } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { UpdateFeeConfigSchema } from '@rent-car/common';

const router = Router();
const service = new FeeConfigService();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const items = await service.listFeeConfigs();
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

router.get('/:key', authMiddleware, async (req, res, next) => {
  try {
    const item = await service.getFeeConfigByKey(req.params.key);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(UpdateFeeConfigSchema), async (req, res, next) => {
  try {
    const item = await service.updateFeeConfig(req.params.id, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

export default router;
