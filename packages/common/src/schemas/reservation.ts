import { z } from 'zod';

export const CreateReservationSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  rentalDate: z.string(),
  scheduledReturnDate: z.string(),
  stripePaymentMethodId: z.string().optional().nullable(),
  purchaseOrderNumber: z.string().optional().nullable(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
