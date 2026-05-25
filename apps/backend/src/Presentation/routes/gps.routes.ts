import { Router } from 'express';
import { prisma } from '../../Infrastructure/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';

const router = Router();

// GET /api/gps/live - Get latest GPS coordinates for all vehicles
router.get('/live', authMiddleware, async (req, res, next) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        brand: true,
        model: true,
      }
    });

    const liveData = [];
    
    // Santo Domingo coordinates range for fallback simulation
    const centerLat = 18.4861;
    const centerLng = -69.9312;

    for (const vehicle of vehicles) {
      // Find latest log
      let latestLog = await prisma.gpsLog.findFirst({
        where: { vehicleId: vehicle.id },
        orderBy: { timestamp: 'desc' }
      });

      // If no log, generate a fake live location simulating movement
      if (!latestLog) {
        const offsetLat = (Math.random() - 0.5) * 0.05;
        const offsetLng = (Math.random() - 0.5) * 0.05;
        latestLog = {
          id: `temp-${vehicle.id}`,
          vehicleId: vehicle.id,
          latitude: centerLat + offsetLat,
          longitude: centerLng + offsetLng,
          speedKmH: vehicle.status === 'RENTED' ? Math.floor(Math.random() * 80) + 20 : 0,
          heading: Math.floor(Math.random() * 360),
          timestamp: new Date(),
        };
      }

      liveData.push({
        vehicleId: vehicle.id,
        plateNumber: vehicle.plateNumber,
        brand: vehicle.brand.name,
        model: vehicle.model.name,
        status: vehicle.status,
        latitude: latestLog.latitude,
        longitude: latestLog.longitude,
        speedKmH: latestLog.speedKmH,
        heading: latestLog.heading,
        timestamp: latestLog.timestamp,
      });
    }

    res.status(200).json({ success: true, data: liveData });
  } catch (error) {
    next(error);
  }
});

// GET /api/gps/geofences - List all geofences
router.get('/geofences', authMiddleware, async (req, res, next) => {
  try {
    const geofences = await prisma.geofence.findMany();
    res.status(200).json({ success: true, data: geofences });
  } catch (error) {
    next(error);
  }
});

// POST /api/gps/geofences - Save/Create a geofence
router.post('/geofences', authMiddleware, requireRole(['ADMINISTRATOR']), async (req, res, next) => {
  try {
    const { name, coordinatesJson, alertEmail, isActive } = req.body;
    
    if (!name || !coordinatesJson || !alertEmail) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const geofence = await prisma.geofence.create({
      data: {
        name,
        coordinatesJson: typeof coordinatesJson === 'string' ? coordinatesJson : JSON.stringify(coordinatesJson),
        alertEmail,
        isActive: isActive ?? true
      }
    });

    res.status(201).json({ success: true, data: geofence });
  } catch (error) {
    next(error);
  }
});

// GET /api/gps/trail/:vehicleId - Historical GPS trail log
router.get('/trail/:vehicleId', authMiddleware, async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    let logs = await prisma.gpsLog.findMany({
      where: { vehicleId },
      orderBy: { timestamp: 'asc' }
    });

    // If no trail logs in database, generate a mock historical path
    if (logs.length === 0) {
      const centerLat = 18.4861;
      const centerLng = -69.9312;
      const now = Date.now();
      
      logs = Array.from({ length: 15 }).map((_, idx) => {
        const factor = idx / 14;
        const lat = centerLat + Math.sin(factor * Math.PI) * 0.02 + (idx * 0.001);
        const lng = centerLng + Math.cos(factor * Math.PI) * 0.02 + (idx * 0.0015);
        return {
          id: `mock-trail-${vehicleId}-${idx}`,
          vehicleId,
          latitude: lat,
          longitude: lng,
          speedKmH: 45 + Math.sin(factor * 5) * 20 + (Math.random() * 10),
          heading: Math.floor(factor * 180),
          timestamp: new Date(now - (15 - idx) * 10 * 60 * 1000), // 10 mins apart
        };
      });
    }

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

export default router;
