import { Router } from 'express';
import { CatalogService } from '../../Application/services/catalog.service.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { CreateCustomerSchema, UpdateCustomerSchema } from '@rent-car/common';

const router = Router();
const service = new CatalogService();

// GET /api/customers/me
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const item = await service.getCustomerByUserId(req.user!.userId);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PUT /api/customers/me
router.put('/me', authMiddleware, validateBody(UpdateCustomerSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const item = await service.updateCustomerByUserId(req.user!.userId, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const search = req.query.search?.toString();
    const status = req.query.status?.toString();
    const type = req.query.type?.toString();
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await service.listCustomers({ search, status, type, page, limit });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await service.getCustomerById(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// POST /api/customers
router.post('/', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), validateBody(CreateCustomerSchema), async (req, res, next) => {
  try {
    const item = await service.createCustomer(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PUT /api/customers/:id
router.put('/:id', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), validateBody(UpdateCustomerSchema), async (req, res, next) => {
  try {
    const item = await service.updateCustomer(req.params.id, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/customers/:id/status
router.patch('/:id/status', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), async (req, res, next) => {
  try {
    const item = await service.toggleCustomerStatus(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/me/payment-methods
router.get('/me/payment-methods', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cards = await service.listMyPaymentMethods(req.user!.userId);
    res.status(200).json({ success: true, data: cards });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/customers/me/payment-methods/:paymentMethodId
router.delete('/me/payment-methods/:paymentMethodId', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    await service.deleteMyPaymentMethod(req.user!.userId, req.params.paymentMethodId);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id/payment-methods
router.get('/:id/payment-methods', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), async (req, res, next) => {
  try {
    const cards = await service.listCustomerPaymentMethods(req.params.id);
    res.status(200).json({ success: true, data: cards });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/customers/:id/payment-methods/:paymentMethodId
router.delete('/:id/payment-methods/:paymentMethodId', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), async (req, res, next) => {
  try {
    await service.deleteCustomerPaymentMethod(req.params.id, req.params.paymentMethodId);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
