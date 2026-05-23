import { z } from 'zod';
import { VehicleStatus, CleaningStatus } from '../enums.js';

export const VehicleSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  chassisNumber: z.string(),
  engineNumber: z.string(),
  plateNumber: z.string(),
  vehicleTypeId: z.string(),
  brandId: z.string(),
  modelId: z.string(),
  fuelTypeId: z.string(),
  status: z.enum(VehicleStatus),
  cleaningStatus: z.enum(CleaningStatus),
  imageUrl: z.string().nullable(),
  odometer: z.number().nonnegative(),
  lastMaintenanceOdometer: z.number().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateVehicleSchema = z.object({
  description: z.string().optional(),
  chassisNumber: z.string().min(1, 'Chassis number is required'),
  engineNumber: z.string().min(1, 'Engine number is required'),
  plateNumber: z.string().min(1, 'Plate number is required'),
  vehicleTypeId: z.string().min(1, 'Vehicle type is required'),
  brandId: z.string().min(1, 'Brand is required'),
  modelId: z.string().min(1, 'Model is required'),
  fuelTypeId: z.string().min(1, 'Fuel type is required'),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  odometer: z.number().nonnegative('Odometer cannot be negative'),
  lastMaintenanceOdometer: z.number().nonnegative('Maintenance odometer cannot be negative').optional(),
});

export const UpdateVehicleSchema = CreateVehicleSchema.partial();

export type Vehicle = z.infer<typeof VehicleSchema>;
export type CreateVehicleInput = z.infer<typeof CreateVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof UpdateVehicleSchema>;
