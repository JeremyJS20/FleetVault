import { z } from 'zod';

export const GpsLogSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  speedKmH: z.number().nonnegative(),
  heading: z.number().min(0).max(360),
  timestamp: z.string(),
});

export const GeofenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  coordinatesJson: z.string(), // Stringified polygon coordinates: [lat, lng][]
  alertEmail: z.string().email(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateGeofenceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  coordinatesJson: z.string().refine((val) => {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) && parsed.every(coord => Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number');
    } catch {
      return false;
    }
  }, 'Invalid polygon coordinate array format'),
  alertEmail: z.string().email('Invalid contact email'),
  isActive: z.boolean().optional().default(true),
});

export const UpdateGeofenceSchema = CreateGeofenceSchema.partial();

export type GpsLog = z.infer<typeof GpsLogSchema>;
export type Geofence = z.infer<typeof GeofenceSchema>;
export type CreateGeofenceInput = z.infer<typeof CreateGeofenceSchema>;
export type UpdateGeofenceInput = z.infer<typeof UpdateGeofenceSchema>;
