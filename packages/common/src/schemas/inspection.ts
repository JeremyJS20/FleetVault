import { z } from 'zod';
import { InspectionStatus, FuelLevel } from '../enums.js';
import { InspectionDamageSchema } from './damage-type.js';

export const InspectionSchema = z.object({
  id: z.string(),
  rentalId: z.string(),
  type: z.enum(['PICKUP', 'RETURN']),
  vehicleId: z.string(),
  customerId: z.string(),
  employeeId: z.string(),
  fuelGaugeLevel: z.enum(FuelLevel),
  odometer: z.number().nonnegative(),
  status: z.enum(InspectionStatus),
  photoUrls: z.array(z.string()),
  comments: z.string().nullable(),
  inspectionDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  damages: z.array(InspectionDamageSchema),
});

export const CreateInspectionSchema = z.object({
  rentalId: z.string().min(1, 'Rental is required'),
  type: z.enum(['PICKUP', 'RETURN']),
  employeeId: z.string().optional().nullable(),
  fuelGaugeLevel: z.enum(FuelLevel),
  odometer: z.number().nonnegative('Odometer must be non-negative'),
  damages: z.array(InspectionDamageSchema).optional().default([]),
  photoUrls: z.array(z.string().url('Invalid photo URL')).optional().default([]),
  comments: z.string().optional().nullable(),
});

export type Inspection = z.infer<typeof InspectionSchema>;
export type CreateInspectionInput = z.infer<typeof CreateInspectionSchema>;
