import { z } from 'zod';
import { EntityStatus } from '../enums.js';

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  brandId: z.string(),
  brand: z.object({ id: z.string(), name: z.string() }).optional(),
  status: z.enum(EntityStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateModelSchema = z.object({
  name: z.string().min(1, 'Model name is required'),
  brandId: z.string().min(1, 'Brand is required'),
});

export const UpdateModelSchema = CreateModelSchema.partial();

export type Model = z.infer<typeof ModelSchema>;
export type CreateModelInput = z.infer<typeof CreateModelSchema>;
export type UpdateModelInput = z.infer<typeof UpdateModelSchema>;
