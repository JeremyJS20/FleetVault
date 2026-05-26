import { z } from 'zod';
import { WorkingShift, EntityStatus, EmployeeRole } from '../enums.js';

export const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  nationalId: z.string(),
  phone: z.string().optional().nullable(),
  signatureUrl: z.string().optional().nullable(),
  commissionPercentage: z.number().min(0).max(100),
  hireDate: z.string(),
  shift: z.enum(WorkingShift),
  status: z.enum(EntityStatus),
  userId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  nationalId: z.string().min(1, 'National ID is required'),
  phone: z.string().optional().nullable(),
  signatureUrl: z.string().url('Invalid URL').optional().nullable(),
  commissionPercentage: z.number().min(0, 'Commission must be at least 0').max(100, 'Commission cannot exceed 100'),
  hireDate: z.string().refine((d) => new Date(d) <= new Date(), 'Hire date cannot be in the future'),
  shift: z.enum(WorkingShift),
  role: z.enum(EmployeeRole),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().extend({
  status: z.enum(EntityStatus).optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
