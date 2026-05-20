import { Router } from 'express';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { RegisterSchema, CustomerRegisterSchema, LoginSchema, RefreshTokenSchema } from '@rent-car/common';
import { AuthService } from '../../Application/services/auth.service.js';
import { PrismaUserRepository } from '../../Infrastructure/repositories/prisma-user.repository.js';
import { PrismaCustomerRepository } from '../../Infrastructure/repositories/prisma-customer.repository.js';

const router = Router();

const userRepository = new PrismaUserRepository();
const customerRepository = new PrismaCustomerRepository();
const authService = new AuthService(userRepository, customerRepository);

// POST /register
router.post('/register', validateBody(RegisterSchema), async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /register/customer
router.post('/register/customer', validateBody(CustomerRegisterSchema), async (req, res, next) => {
  try {
    const result = await authService.registerCustomer(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /login
router.post('/login', validateBody(LoginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// POST /refresh
router.post('/refresh', validateBody(RefreshTokenSchema), async (req, res, next) => {
  try {
    const result = await authService.refreshToken(req.body.refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /me
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (error) {
    next(error);
  }
});

export default router;
