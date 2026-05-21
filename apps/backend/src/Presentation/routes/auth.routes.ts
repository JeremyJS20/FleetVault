import { Router } from 'express';
import { validateBody } from '../../Application/middleware/validation.middleware.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { RegisterSchema, CustomerRegisterSchema, LoginSchema, RefreshTokenSchema, QuickRegisterSchema } from '@rent-car/common';
import { AuthService } from '../../Application/services/auth.service.js';
import { PrismaUserRepository } from '../../Infrastructure/repositories/prisma-user.repository.js';
import { PrismaCustomerRepository } from '../../Infrastructure/repositories/prisma-customer.repository.js';
import { prisma } from '../../Infrastructure/db.js';

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

// POST /register/quick
router.post('/register/quick', validateBody(QuickRegisterSchema), async (req, res, next) => {
  try {
    const result = await authService.quickRegister(req.body);
    res.status(201).json({
      success: true,
      data: {
        ...result,
        user: {
          ...result.user,
          name: result.customer.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /login
router.post('/login', validateBody(LoginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    
    // Fetch the name for the user
    const dbUser = await prisma.user.findUnique({
      where: { id: result.user.id },
      include: {
        customer: true,
        employee: true,
      },
    });

    const name = dbUser?.customer?.name || dbUser?.employee?.name || result.user.email.split('@')[0];

    res.status(200).json({
      success: true,
      data: {
        ...result,
        user: {
          ...result.user,
          name,
        },
      },
    });
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
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        customer: true,
        employee: true,
      },
    });

    if (!dbUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const name = dbUser.customer?.name || dbUser.employee?.name || dbUser.email.split('@')[0];

    res.status(200).json({
      success: true,
      data: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
