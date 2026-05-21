import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

// Resolve root .env regardless of CWD (backend CWD is apps/backend, but .env is in monorepo root)
// src/Presentation -> src -> backend -> apps -> rent-car (root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });
console.log(`[ENV] Loading .env from: ${envPath}`);
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { prisma } from '../Infrastructure/db.js';
import { HealthStatusSchema } from '@rent-car/common';
import apiRouter from './routes/index.js';
import { errorHandler } from '../Application/middleware/error-handler.middleware.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : ['http://localhost:5173'],
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    // Basic connectivity check
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

// Mount all API routes
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`[Backend] Running on http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});

