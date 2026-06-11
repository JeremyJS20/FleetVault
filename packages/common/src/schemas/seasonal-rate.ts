import { z } from 'zod';
import { EntityStatus } from '../enums.js';

export const SeasonalRateSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  multiplier: z.number().min(1.01, 'El multiplicador de temporada debe ser mayor a 1.0'),
  status: z.enum(EntityStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateSeasonalRateSchema = z.object({
  name: z.string().min(1, 'Rate name is required'),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid start date'),
  endDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid end date'),
  multiplier: z.number().min(1.01, 'El multiplicador de temporada debe ser mayor a 1.0'),
});

export const UpdateSeasonalRateSchema = CreateSeasonalRateSchema.partial().extend({
  status: z.enum(EntityStatus).optional(),
});

export type SeasonalRate = z.infer<typeof SeasonalRateSchema>;
export type CreateSeasonalRateInput = z.infer<typeof CreateSeasonalRateSchema>;
export type UpdateSeasonalRateInput = z.infer<typeof UpdateSeasonalRateSchema>;
