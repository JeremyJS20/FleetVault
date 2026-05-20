import { z } from 'zod';

export const HealthStatusSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  uptime: z.number(),
  database: z.string(),
  message: z.string()
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
