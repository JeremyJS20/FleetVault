import { z } from 'zod';
import { EntityStatus } from '../enums.js';

export const VehicleTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(EntityStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateVehicleTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const UpdateVehicleTypeSchema = CreateVehicleTypeSchema.partial();

export type VehicleType = z.infer<typeof VehicleTypeSchema>;
export type CreateVehicleTypeInput = z.infer<typeof CreateVehicleTypeSchema>;
export type UpdateVehicleTypeInput = z.infer<typeof UpdateVehicleTypeSchema>;
