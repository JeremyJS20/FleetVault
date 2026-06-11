import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });
console.log(`[ENV] Loading .env from: ${envPath}`);

import { prisma } from '../Infrastructure/db.js';
import { GpsSimulatorService } from '../Application/services/gps-simulator.service.js';
import { RentalService } from '../Application/services/rental.service.js';
import cron from 'node-cron';
import app from './app.js';

const port = process.env.PORT || 3001;
const gpsSimulator = new GpsSimulatorService();
const rentalService = new RentalService();

const server = app.listen(port, () => {
  console.log(`[Backend] Running on http://localhost:${port}`);

  // Uncomment for GPS simulation and cron in dev:
  // gpsSimulator.start();
  // cron.schedule('*/5 * * * *', async () => {
  //   console.log('[CRON] Running late pending rentals check...');
  //   try {
  //     const cancelled = await rentalService.cancelLatePendingRentals();
  //     if (cancelled.length > 0) {
  //       console.log(`[CRON] Auto-cancelled ${cancelled.length} late pending rentals.`);
  //     }
  //   } catch (err) {
  //     console.error('[CRON] Error checking late pending rentals:', err);
  //   }
  // });
});

process.on('SIGTERM', () => {
  gpsSimulator.stop();
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
});
