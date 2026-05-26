import { Router } from 'express';
import { CompanyInfoService } from '../../Application/services/company-info.service.js';
import { authMiddleware } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { UpdateCompanyInfoSchema } from '@rent-car/common';

const router = Router();
const service = new CompanyInfoService();

// Public: get company info
router.get('/', async (req, res, next) => {
  try {
    const info = await service.getCompanyInfo();
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    next(error);
  }
});

// Admin only: create or update company info
router.put('/', authMiddleware, requireRole(['ADMINISTRATOR']), validateBody(UpdateCompanyInfoSchema), async (req, res, next) => {
  try {
    const info = await service.upsertCompanyInfo(req.body);
    res.status(200).json({ success: true, data: info });
  } catch (error) {
    next(error);
  }
});

export default router;
