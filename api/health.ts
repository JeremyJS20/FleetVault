import type { Request, Response } from 'express';
import { prisma } from '../apps/backend/src/Infrastructure/db.js';
import { HealthStatusSchema } from '../packages/common/src/index.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const payload = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Connected',
      message: 'Hello World from RentCar Vercel Serverless Handler!'
    };
    const result = HealthStatusSchema.safeParse(payload);
    if (!result.success) {
      return res.status(500).json({ success: false, error: 'Internal validation failed' });
    }
    return res.status(200).json({ success: true, data: result.data });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Database connection failed',
      details: err.message
    });
  }
}
