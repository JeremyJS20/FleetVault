import { z } from 'zod';

export const FeeConfigSchema = z.object({
  id: z.string(),
  key: z.string().nullable(),
  label: z.string(),
  amount: z.number(),
  isActive: z.boolean(),
  description: z.string().nullable(),
  damageTypeId: z.string().nullable(),
  updatedAt: z.string(),
});

export const UpdateFeeConfigSchema = z.object({
  amount: z.number().min(0, 'Amount must be non-negative').optional(),
  isActive: z.boolean().optional(),
});

export type FeeConfig = z.infer<typeof FeeConfigSchema>;
export type UpdateFeeConfigInput = z.infer<typeof UpdateFeeConfigSchema>;
