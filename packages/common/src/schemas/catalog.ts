import { z } from 'zod';

export const CatalogSearchSchema = z.object({
  typeId: z.string().optional(),
  brandId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  seats: z.number().optional(),
  fuelTypeId: z.string().optional(),
});

export const CatalogVehicleSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  plateNumber: z.string(),
  imageUrl: z.string().nullable(),
  odometer: z.number(),
  vehicleType: z.object({ id: z.string(), name: z.string() }),
  brand: z.object({ id: z.string(), name: z.string() }),
  model: z.object({ id: z.string(), name: z.string() }),
  fuelType: z.object({ id: z.string(), name: z.string() }),
  baseDailyRate: z.number(),
  calculatedDailyRate: z.number(), // Includes active seasonal dynamic rate multipliers
  hasSeasonalRate: z.boolean(),
  seasonalMultiplier: z.number(),
  seasonalRateName: z.string().nullable(),
});

export type CatalogSearchQuery = z.infer<typeof CatalogSearchSchema>;
export type CatalogVehicle = z.infer<typeof CatalogVehicleSchema>;
