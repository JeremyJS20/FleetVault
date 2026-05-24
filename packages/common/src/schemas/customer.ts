import { z } from 'zod';
import { CustomerStatus, CustomerType } from '../enums.js';

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional().nullable(),
  nationalId: z.string(),
  creditCardNumber: z.string().nullable(),
  creditLimit: z.number().nonnegative(),
  type: z.enum(CustomerType),
  status: z.enum(CustomerStatus),
  licenseNumber: z.string(),
  licenseCountry: z.string(),
  licenseExpDate: z.string(),
  licensePhotoUrl: z.string().nullable(),
  userId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().nullable(),
  nationalId: z.string().min(1, 'National ID is required'),
  creditCardNumber: z.string().optional().nullable(),
  creditLimit: z.number().nonnegative('Credit limit must be at least 0'),
  type: z.enum(CustomerType),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseCountry: z.string().min(1, 'License country is required'),
  licenseExpDate: z.string().refine((d) => {
    const expDate = new Date(d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expDate >= today;
  }, 'License is expired'),
  licensePhotoUrl: z.string().url('Invalid photo URL').optional().nullable(),
  userId: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({
  status: z.enum(CustomerStatus).optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
