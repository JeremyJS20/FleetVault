import { z } from 'zod';
import { EntityStatus } from '../enums.js';

export const BrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(EntityStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
});

export const UpdateBrandSchema = CreateBrandSchema.partial();

export type Brand = z.infer<typeof BrandSchema>;
export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;
export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>;
