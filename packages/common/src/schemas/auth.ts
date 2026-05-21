import { z } from 'zod';
import { UserRole } from '../enums.js';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(UserRole),
});

export const CustomerRegisterSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  nationalId: z.string().min(1, 'National ID is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseCountry: z.string().min(1, 'License country is required'),
  licenseExpDate: z.string().refine((d) => new Date(d) > new Date(), 'License must not be expired'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const TokenPayloadSchema = z.object({
  userId: z.string(),
  email: z.string(),
  role: z.enum(UserRole),
});

export const QuickRegisterSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CustomerRegisterInput = z.infer<typeof CustomerRegisterSchema>;
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
export type QuickRegisterInput = z.infer<typeof QuickRegisterSchema>;
