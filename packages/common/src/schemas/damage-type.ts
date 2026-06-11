import { z } from 'zod';

export const DamageTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateDamageTypeSchema = z.object({
  name: z.string().min(1, 'Damage type name is required'),
  key: z.string().min(1, 'Key is required'),
  description: z.string().optional().nullable(),
});

export const UpdateDamageTypeSchema = CreateDamageTypeSchema.partial();

export const CreateDamageFeeSchema = z.object({
  damageTypeId: z.string().min(1),
  amount: z.number().min(0, 'Amount must be non-negative'),
});

export const InspectionDamageSchema = z.object({
  damageTypeId: z.string().min(1),
  tirePosition: z.string().optional().nullable(),
});

export const CreateInspectionDamagesSchema = z.array(InspectionDamageSchema);

export type DamageType = z.infer<typeof DamageTypeSchema>;
export type CreateDamageTypeInput = z.infer<typeof CreateDamageTypeSchema>;
export type UpdateDamageTypeInput = z.infer<typeof UpdateDamageTypeSchema>;
export type CreateDamageFeeInput = z.infer<typeof CreateDamageFeeSchema>;
export type InspectionDamageInput = z.infer<typeof InspectionDamageSchema>;
