import { z } from 'zod';
import { InspectionStatus, FuelLevel, TireCondition } from '../enums.js';

export const InspectionSchema = z.object({
  id: z.string(),
  rentalId: z.string().nullable(), // Nullable for general checklist checkups
  vehicleId: z.string(),
  customerId: z.string(),
  employeeId: z.string(),
  hasScratches: z.boolean(),
  fuelGaugeLevel: z.enum(FuelLevel),
  fuelGaugePhotoUrl: z.string(), // Mandatory fuel gauge photo
  hasSpareTire: z.boolean(),
  hasJack: z.boolean(),
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
  rentalId: z.string().optional().nullable(),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  customerId: z.string().min(1, 'Customer is required'),
  employeeId: z.string().optional(),
  hasScratches: z.boolean(),
  fuelGaugeLevel: z.enum(FuelLevel),
  fuelGaugePhotoUrl: z.string().url('Mandatory fuel gauge photo URL is required'),
  hasSpareTire: z.boolean(),
  hasJack: z.boolean(),
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
