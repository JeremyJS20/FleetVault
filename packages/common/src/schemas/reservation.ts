import { z } from 'zod';

export const CreateReservationSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  rentalDate: z.string(),
  scheduledReturnDate: z.string(),
  stripePaymentMethodId: z.string().min(1, 'Payment card is required'),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
