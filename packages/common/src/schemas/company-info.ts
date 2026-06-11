import { z } from 'zod';
import { validateRNC } from '../validators/dominican-id.js';

export const CompanyInfoSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  rnc: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  website: z.string().nullable(),
  city: z.string(),
  logoUrl: z.string().nullable(),
  updatedAt: z.string(),
});

export const UpdateCompanyInfoSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  rnc: z.string().min(1, 'RNC is required').refine(
    (val) => validateRNC(val),
    'Invalid Dominican RNC (must be 9 digits with valid check digit)',
  ),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Valid email is required'),
  website: z.string().url('Invalid URL').optional().nullable(),
  city: z.string().min(1, 'City is required'),
  logoUrl: z.string().url('Invalid URL').optional().nullable(),
});

export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;
export type UpdateCompanyInfoInput = z.infer<typeof UpdateCompanyInfoSchema>;
