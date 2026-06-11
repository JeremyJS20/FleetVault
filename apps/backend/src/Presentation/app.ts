import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { prisma } from '../Infrastructure/db.js';
import { HealthStatusSchema } from '@rent-car/common';
import apiRouter from './routes/index.js';
import { errorHandler } from '../Application/middleware/error-handler.middleware.js';

const app = express();

const corsOrigin = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : (
      process.env.NODE_ENV === 'production'
        ? []
        : ['http://localhost:5173']
    );

app.use(helmet());
app.use(cors({
  origin: corsOrigin.length > 0 ? corsOrigin : true,
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const payload = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'Connected',
      message: 'Hello World from RentCar API!'
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
});

app.use('/api', apiRouter);

app.use(errorHandler);

export default app;
