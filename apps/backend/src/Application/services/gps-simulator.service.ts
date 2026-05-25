import { prisma } from '../../Infrastructure/db.js';
import { GpsService } from './gps.service.js';

const FUEL_STEPS = ['FULL', 'THREE_QUARTERS', 'HALF', 'QUARTER', 'EMPTY'];

export class GpsSimulatorService {
  private gpsService = new GpsService();
  private intervalId: NodeJS.Timeout | null = null;
  private vehiclePositions: Record<string, { lat: number; lng: number }> = {};
  private vehicleFuel: Record<string, { level: string; ticks: number }> = {};

  start() {
    if (this.intervalId) {
      console.log('[GPS SIMULATOR] Already running.');
      return;
    }

    console.log('[GPS SIMULATOR] Starting 5-second interval simulation...');
    this.intervalId = setInterval(async () => {
      try {
        await this.tick();
      } catch (err) {
        console.error('[GPS SIMULATOR] Error in simulation tick:', err);
      }
    }, 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[GPS SIMULATOR] Stopped simulation.');
    }
  }

  private async tick() {
    // 1. Fetch active rentals
    const activeRentals = await prisma.rental.findMany({
      where: { status: 'ACTIVE' },
      include: { vehicle: true },
    });

    if (activeRentals.length === 0) {
      return;
    }

    for (const rental of activeRentals) {
      const vehicle = rental.vehicle;

      // 2. Determine or initialize vehicle location
      let currentPos = this.vehiclePositions[vehicle.id];
      if (!currentPos) {
        // Query latest GPS log for this vehicle if available
        const latestLog = await prisma.gpsLog.findFirst({
          where: { vehicleId: vehicle.id },
          orderBy: { timestamp: 'desc' },
        });

        if (latestLog) {
          currentPos = { lat: latestLog.latitude, lng: latestLog.longitude };
        } else {
          // Default to Santo Domingo center coordinates
          currentPos = { lat: 18.4861, lng: -69.9312 };
        }
      }

      // Simulate a small move (approx. speed 60 km/h is 16.6 m/s, or ~83 meters per 5s)
      // 1 degree lat is ~111 km, so 83m is roughly 0.00075 degrees.
      // We alter lat/lng slightly to simulate driving.
      const latDelta = (Math.random() - 0.45) * 0.001; // Slightly biased to move
      const lngDelta = (Math.random() - 0.45) * 0.001;
      
      const newLat = currentPos.lat + latDelta;
      const newLng = currentPos.lng + lngDelta;
      this.vehiclePositions[vehicle.id] = { lat: newLat, lng: newLng };

      const speedKmH = parseFloat((40 + Math.random() * 30).toFixed(1)); // 40-70 km/h
      const heading = Math.floor(Math.random() * 360);

      // Distance traveled in 5s: speedKmH / 720 (km)
      const distance = speedKmH / 720;
      const newOdometer = parseFloat((vehicle.odometer + distance).toFixed(3));

      // 3. Update vehicle odometer in DB
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { odometer: newOdometer },
      });

      // 4. Decrease Fuel level (in-memory simulation)
      let fuelState = this.vehicleFuel[vehicle.id];
      if (!fuelState) {
        fuelState = { level: rental.checkoutFuelLevel || 'FULL', ticks: 0 };
      }

      fuelState.ticks += 1;
      // Decrement fuel level every 25 ticks (~125 seconds of simulated driving)
      if (fuelState.ticks >= 25) {
        fuelState.ticks = 0;
        const currentIndex = FUEL_STEPS.indexOf(fuelState.level);
        if (currentIndex !== -1 && currentIndex < FUEL_STEPS.length - 1) {
          fuelState.level = FUEL_STEPS[currentIndex + 1];
          console.log(
            `[GPS SIMULATOR] Vehicle ${vehicle.plateNumber} (ID: ${vehicle.id}) fuel consumed. New Level: ${fuelState.level}`
          );
        }
      }
      this.vehicleFuel[vehicle.id] = fuelState;

      // 5. Ingest telemetry (this will check geofences and log breaches)
      await this.gpsService.ingestTelemetry(vehicle.id, {
        latitude: newLat,
        longitude: newLng,
        speedKmH,
        heading,
      });
    }
  }
}
