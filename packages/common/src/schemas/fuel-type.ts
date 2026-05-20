import { z } from 'zod';
import { EntityStatus } from '../enums.js';

export const FuelTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(EntityStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateFuelTypeSchema = z.object({
  name: z.string().min(1, 'Fuel type name is required'),
});

export const UpdateFuelTypeSchema = CreateFuelTypeSchema.partial();

export type FuelType = z.infer<typeof FuelTypeSchema>;
export type CreateFuelTypeInput = z.infer<typeof CreateFuelTypeSchema>;
export type UpdateFuelTypeInput = z.infer<typeof UpdateFuelTypeSchema>;
