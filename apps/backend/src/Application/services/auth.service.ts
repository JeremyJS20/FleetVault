import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository, ICustomerRepository } from '../../Domain/repositories/index.js';
import { ConflictError, ValidationError } from '../../Domain/errors/index.js';
import { LoginInput, RegisterInput, CustomerRegisterInput, TokenPayload, QuickRegisterInput } from '@rent-car/common';
import { EmailService } from './email.service.js';


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
      throw new ConflictError('Email already registered');
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
