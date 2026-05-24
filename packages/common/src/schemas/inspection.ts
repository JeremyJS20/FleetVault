import { z } from 'zod';
import { InspectionStatus, FuelLevel, TireCondition } from '../enums.js';

export const InspectionSchema = z.object({
  id: z.string(),
  rentalId: z.string(),
  type: z.enum(['PICKUP', 'RETURN']),
  vehicleId: z.string(),
  customerId: z.string(),
  employeeId: z.string(),
  hasScratches: z.boolean(),
  fuelGaugeLevel: z.enum(FuelLevel),
  missingSpareTire: z.boolean(),
  missingJack: z.boolean(),
  hasBrokenGlass: z.boolean(),
  tireConditionFrontLeft: z.enum(TireCondition),
  tireConditionFrontRight: z.enum(TireCondition),
  tireConditionRearLeft: z.enum(TireCondition),
  tireConditionRearRight: z.enum(TireCondition),
  odometer: z.number().nonnegative(),
  status: z.enum(InspectionStatus),
  photoUrls: z.array(z.string()), // general additional photos
  comments: z.string().nullable(),
  inspectionDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateInspectionSchema = z.object({
  rentalId: z.string().min(1, 'Rental is required'),
  type: z.enum(['PICKUP', 'RETURN']),
  employeeId: z.string().optional().nullable(),
  hasScratches: z.boolean(),
  fuelGaugeLevel: z.enum(FuelLevel),
  missingSpareTire: z.boolean(),
  missingJack: z.boolean(),
  hasBrokenGlass: z.boolean(),
  tireConditionFrontLeft: z.enum(TireCondition),
  tireConditionFrontRight: z.enum(TireCondition),
  tireConditionRearLeft: z.enum(TireCondition),
  tireConditionRearRight: z.enum(TireCondition),
  odometer: z.number().nonnegative('Odometer must be non-negative'),
  photoUrls: z.array(z.string().url('Invalid photo URL')).optional().default([]),
  comments: z.string().optional().nullable(),
});

export type Inspection = z.infer<typeof InspectionSchema>;
export type CreateInspectionInput = z.infer<typeof CreateInspectionSchema>;
