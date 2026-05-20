import { z } from 'zod';
import { RentalStatus, FuelLevel } from '../enums.js';

export const RentalSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  customerId: z.string(),
  vehicleId: z.string(),
  rentalDate: z.string(),
  scheduledReturnDate: z.string(),
  actualReturnDate: z.string().nullable(),
  pricePerDay: z.number().positive(),
  checkoutOdometer: z.number().nonnegative(),
  returnOdometer: z.number().nonnegative().nullable(),
  checkoutFuelLevel: z.enum(FuelLevel),
  returnFuelLevel: z.enum(FuelLevel).nullable(),
  status: z.enum(RentalStatus),
  comments: z.string().nullable(),
  signatureUrl: z.string().nullable(),
  returnSignatureUrl: z.string().nullable(),
  purchaseOrderNumber: z.string().nullable(), // Corporate PO
  stripePaymentIntentId: z.string().nullable(), // Pre-auth or upfront capture
  contractPdfUrl: z.string().nullable(),
  totalCost: z.number().nonnegative().nullable(),
  commissionAmount: z.number().nonnegative().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateRentalSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  customerId: z.string().min(1, 'Customer is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  rentalDate: z.string(),
  scheduledReturnDate: z.string(),
  pricePerDay: z.number().positive('Daily rate must be positive'),
  checkoutOdometer: z.number().nonnegative('Checkout odometer cannot be negative'),
  checkoutFuelLevel: z.enum(FuelLevel),
  purchaseOrderNumber: z.string().optional().nullable(),
  stripePaymentIntentId: z.string().optional().nullable(),
  signatureUrl: z.string().min(1, 'Customer checkout signature is required'),
  comments: z.string().optional().nullable(),
});

export const ReturnRentalSchema = z.object({
  actualReturnDate: z.string(),
  returnOdometer: z.number().nonnegative('Return odometer cannot be negative'),
  returnFuelLevel: z.enum(FuelLevel),
  returnSignatureUrl: z.string().min(1, 'Customer return signature is required'),
  comments: z.string().optional().nullable(),
  // Check conditions from checkout to calculate damage charges
  hasBrokenGlass: z.boolean(),
  damagedTiresCount: z.number().min(0).max(4),
  hasNewScratches: z.boolean(),
});

export type Rental = z.infer<typeof RentalSchema>;
export type CreateRentalInput = z.infer<typeof CreateRentalSchema>;
export type ReturnRentalInput = z.infer<typeof ReturnRentalSchema>;
