import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository, ICustomerRepository } from '../../Domain/repositories/index.js';
import { ConflictError, ValidationError } from '../../Domain/errors/index.js';
import { LoginInput, RegisterInput, CustomerRegisterInput, TokenPayload, QuickRegisterInput } from '@rent-car/common';
import { EmailService } from './email.service.js';
import { StripeService } from './stripe.service.js';
import { prisma } from '../../Infrastructure/db.js';

const stripeService = new StripeService();


export class AuthService {
  constructor(
    private userRepository: IUserRepository,
    private customerRepository: ICustomerRepository
  ) {}

  async registerUser(input: RegisterInput) {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      role: input.role,
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async registerCustomer(input: CustomerRegisterInput) {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const existingCustomer = await this.customerRepository.findByNationalId(input.nationalId);
    if (existingCustomer) {
      throw new ConflictError('National ID already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    // Create User first
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      role: 'CUSTOMER',
    });

    // Create Customer
    const customer = await this.customerRepository.create({
      name: `${input.firstName} ${input.lastName}`,
      nationalId: input.nationalId,
      licenseNumber: input.licenseNumber,
      licenseCountry: input.licenseCountry,
      licenseExpDate: new Date(input.licenseExpDate),
      userId: user.id,
    });

    // Create Stripe customer for card transactions
    const stripeCustomer = await stripeService.createCustomer(input.email, `${input.firstName} ${input.lastName}`);
    if (stripeCustomer.id) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      customer: {
        id: customer.id,
        name: customer.name,
      },
    };
  }

  async quickRegister(input: QuickRegisterInput) {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      const magicLinkSecret = process.env.MAGIC_LINK_SECRET || 'fallback-magic-link-secret-for-dev';
      const magicToken = jwt.sign(
        { email: input.email, purpose: 'magic-login' },
        magicLinkSecret,
        { expiresIn: '15m' }
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const magicLink = `${frontendUrl}/magic-login?token=${magicToken}`;

      const emailService = new EmailService();
      await emailService.sendMagicLink(input.email, magicLink);

      return { exists: true, email: input.email, magicLinkSent: true };
    }

    const tempPassword = Math.random().toString(36).slice(-10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      role: 'CUSTOMER',
    });

    const customer = await this.customerRepository.create({
      name: `${input.firstName} ${input.lastName}`,
      userId: user.id,
    });

    const emailService = new EmailService();
    await emailService.sendTemporaryPassword(input.email, tempPassword);

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-for-dev';

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: 'CUSTOMER',
    };

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: '7d' });

    // Create Stripe customer for card transactions
    const stripeCustomer = await stripeService.createCustomer(input.email, `${input.firstName} ${input.lastName}`);
    if (stripeCustomer.id) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      customer: {
        id: customer.id,
        name: customer.name,
      },
    };
  }

  async magicLogin(token: string) {
    const magicLinkSecret = process.env.MAGIC_LINK_SECRET || 'fallback-magic-link-secret-for-dev';
    let payload: { email: string; purpose: string };
    try {
      payload = jwt.verify(token, magicLinkSecret) as any;
    } catch {
      throw new ValidationError('Invalid or expired magic link');
    }

    if (payload.purpose !== 'magic-login') {
      throw new ValidationError('Invalid magic link token');
    }

    const user = await this.userRepository.findByEmail(payload.email);
    if (!user) {
      throw new ValidationError('User not found');
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-for-dev';

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as any,
    };

    const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(tokenPayload, jwtRefreshSecret, { expiresIn: '7d' });

    let customer = null;
    if (user.role === 'CUSTOMER') {
      customer = await this.customerRepository.findByUserId(user.id);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      customer: customer
        ? { id: customer.id, name: customer.name }
        : null,
    };
  }

  async login(input: LoginInput) {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new ValidationError('Invalid email or password');
    }

    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-for-dev';

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as any,
    };

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, jwtRefreshSecret, { expiresIn: '7d' });

    let customer = null;
    if (user.role === 'CUSTOMER') {
      customer = await this.customerRepository.findByUserId(user.id);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      customer: customer
        ? {
            id: customer.id,
            name: customer.name,
          }
        : null,
    };
  }

  async refreshToken(token: string) {
    try {
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-for-dev';
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev';

      const decoded = jwt.verify(token, jwtRefreshSecret) as TokenPayload;

      const newPayload: TokenPayload = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      const accessToken = jwt.sign(newPayload, jwtSecret, { expiresIn: '15m' });
      return { accessToken };
    } catch (error) {
      throw new ValidationError('Invalid or expired refresh token');
    }
  }
}
