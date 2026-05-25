import { z } from 'zod';

export const RentalPolicySchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  content: z.string(),
  isActive: z.boolean(),
  updatedAt: z.string(),
});

export const CreateRentalPolicySchema = z.object({
  key: z.string().min(1, 'Key is required'),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  isActive: z.boolean().optional(),
});

export const UpdateRentalPolicySchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1),
  isActive: z.boolean().optional(),
});

export type RentalPolicy = z.infer<typeof RentalPolicySchema>;
export type CreateRentalPolicyInput = z.infer<typeof CreateRentalPolicySchema>;
export type UpdateRentalPolicyInput = z.infer<typeof UpdateRentalPolicySchema>;
