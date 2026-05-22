import { Router } from 'express';
import { DashboardService } from '../../Application/services/dashboard.service.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';

const router = Router();
const service = new DashboardService();

router.get('/admin', authMiddleware, requireRole(['ADMINISTRATOR', 'AGENT']), async (_req: AuthenticatedRequest, res, next) => {
  try {
    const data = await service.getAdminDashboard();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/customer', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await service.getCustomerDashboard(req.user!.userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
