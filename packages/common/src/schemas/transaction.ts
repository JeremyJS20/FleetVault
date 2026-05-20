import { z } from 'zod';
import { TransactionType } from '../enums.js';

export const TransactionLedgerSchema = z.object({
  id: z.string(),
  rentalId: z.string(),
  amount: z.number(),
  type: z.enum(TransactionType),
  stripePaymentIntentId: z.string().nullable(),
  purchaseOrderNumber: z.string().nullable(),
  stripeFee: z.number().nullable(),
  comments: z.string().nullable(),
  createdAt: z.string(),
});

export type TransactionLedger = z.infer<typeof TransactionLedgerSchema>;
