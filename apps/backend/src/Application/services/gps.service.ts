import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError } from '../../Domain/errors/NotFoundError.js';
import { ValidationError } from '../../Domain/errors/ValidationError.js';

export function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > lng) !== (yj > lng))
        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

export class GpsService {
  async createGeofence(input: { name: string; coordinatesJson: string; alertEmail: string; isActive?: boolean }) {
    return prisma.geofence.create({
      data: {
        name: input.name,
        coordinatesJson: input.coordinatesJson,
        alertEmail: input.alertEmail,
        isActive: input.isActive ?? true,
      },
    });
  }

  async updateGeofence(id: string, input: { name?: string; coordinatesJson?: string; alertEmail?: string; isActive?: boolean }) {
    const existing = await prisma.geofence.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Geofence not found');
    }

    return prisma.geofence.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.coordinatesJson !== undefined ? { coordinatesJson: input.coordinatesJson } : {}),
        ...(input.alertEmail !== undefined ? { alertEmail: input.alertEmail } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async deleteGeofence(id: string) {
    const existing = await prisma.geofence.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Geofence not found');
    }

    return prisma.geofence.delete({ where: { id } });
  }

  async listGeofences() {
    return prisma.geofence.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGeofenceById(id: string) {
    const geofence = await prisma.geofence.findUnique({ where: { id } });
    if (!geofence) {
      throw new NotFoundError('Geofence not found');
    }
    return geofence;
  }

  async ingestTelemetry(vehicleId: string, telemetry: { latitude: number; longitude: number; speedKmH: number; heading: number }) {
    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError(`Vehicle with ID ${vehicleId} not found`);
    }

    // 1. Create a GPS Log
    const log = await prisma.gpsLog.create({
      data: {
        vehicleId,
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        speedKmH: telemetry.speedKmH,
        heading: telemetry.heading,
      },
    });

    // 2. Fetch all active geofences
    const activeGeofences = await prisma.geofence.findMany({
      where: { isActive: true },
    });

    // 3. Check for geofence breaches (exiting)
    for (const geofence of activeGeofences) {
      try {
        const polygon: [number, number][] = JSON.parse(geofence.coordinatesJson);
        if (polygon.length > 0) {
          const inside = isPointInPolygon(telemetry.latitude, telemetry.longitude, polygon);
          if (!inside) {
            // Geofence exit detected!
            this.triggerGeofenceAlert(vehicle, geofence, telemetry);
          }
        }
      } catch (err) {
        console.error(`Failed to process geofence check for geofence ${geofence.id}:`, err);
      }
    }

    return log;
  }

  private triggerGeofenceAlert(vehicle: any, geofence: any, telemetry: { latitude: number; longitude: number }) {
    const alertMsg = `[GEOFENCE BREACH] Vehicle ${vehicle.plateNumber} (ID: ${vehicle.id}) has EXITED active geofence "${geofence.name}" at coordinates [${telemetry.latitude}, ${telemetry.longitude}]`;
    console.warn(alertMsg);

    // Mock Email sending
    const mailFrom = process.env.MAIL_FROM || 'onboarding@resend.dev';
    console.log('--------------------------------------------------');
    console.log(`[EMAIL SERVICE] Sending Geofence Violation Alert`);
    console.log(`To: ${geofence.alertEmail}`);
    console.log(`From: ${mailFrom}`);
    console.log(`Subject: WARNING: Geofence breach detected for vehicle ${vehicle.plateNumber}`);
    console.log(`Body: ${alertMsg}`);
    console.log('--------------------------------------------------');
  }

  async getActiveGpsLocations() {
    const rentedVehicles = await prisma.vehicle.findMany({
      where: { status: 'RENTED' },
      include: {
        gpsLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        brand: true,
        model: true,
      },
    });

    return rentedVehicles.map((v) => ({
      vehicleId: v.id,
      plateNumber: v.plateNumber,
      brand: v.brand.name,
      model: v.model.name,
      status: v.status,
      lastLocation: v.gpsLogs[0] || null,
    }));
  }

  async getVehicleGpsHistory(vehicleId: string, limit = 100) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundError(`Vehicle with ID ${vehicleId} not found`);
    }

    return prisma.gpsLog.findMany({
      where: { vehicleId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
