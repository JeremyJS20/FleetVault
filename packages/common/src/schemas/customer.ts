import { z } from 'zod';
import { CustomerStatus, CustomerType } from '../enums.js';

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  nationalId: z.string(),
  creditCardNumber: z.string().nullable(),
  creditLimit: z.number().nonnegative(),
  type: z.enum(CustomerType),
  status: z.enum(CustomerStatus),
  licenseNumber: z.string().nullable(),
  licenseCountry: z.string().nullable(),
  licenseExpDate: z.string().nullable(),
  licensePhotoUrl: z.string().nullable(),
  userId: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CustomerInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  nationalId: z.string().min(1, 'National ID is required'),
  creditCardNumber: z.string().optional().nullable(),
  creditLimit: z.number().nonnegative('Credit limit must be at least 0'),
  type: z.enum(CustomerType),
  licenseNumber: z.string().nullable().optional(),
  licenseCountry: z.string().nullable().optional(),
  licenseExpDate: z.string().nullable().optional(),
  licensePhotoUrl: z.string().url('Invalid photo URL').optional().nullable(),
  userId: z.string().optional().nullable(),
  stripeCustomerId: z.string().optional().nullable(),
});

export const CreateCustomerSchema = CustomerInputSchema.superRefine((data, ctx) => {
  if (data.type === 'INDIVIDUAL') {
    if (!data.licenseNumber || data.licenseNumber.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'License number is required',
        path: ['licenseNumber'],
      });
    }
    if (!data.licenseCountry || data.licenseCountry.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'License country is required',
        path: ['licenseCountry'],
      });
    }
    if (!data.licenseExpDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'License expiration date is required',
        path: ['licenseExpDate'],
      });
    } else {
      const expDate = new Date(data.licenseExpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'License is expired',
          path: ['licenseExpDate'],
        });
      }
    }
  }
});

export const UpdateCustomerSchema = CustomerInputSchema.partial().extend({
  status: z.enum(CustomerStatus).optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'INDIVIDUAL') {
    if (data.licenseNumber !== undefined && (!data.licenseNumber || data.licenseNumber.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'License number is required',
        path: ['licenseNumber'],
      });
    }
    if (data.licenseCountry !== undefined && (!data.licenseCountry || data.licenseCountry.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'License country is required',
        path: ['licenseCountry'],
      });
    }
    if (data.licenseExpDate !== undefined) {
      if (!data.licenseExpDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'License expiration date is required',
          path: ['licenseExpDate'],
        });
      } else {
        const expDate = new Date(data.licenseExpDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'License is expired',
            path: ['licenseExpDate'],
          });
        }
      }
    }
  }
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
