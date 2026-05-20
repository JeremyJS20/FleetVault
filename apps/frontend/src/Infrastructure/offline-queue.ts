import { openDB, DBSchema } from 'idb';

interface OfflineInspection {
  id: string;
  rentalId?: string | null;
  vehicleId: string;
  customerId: string;
  employeeId: string;
  hasScratches: boolean;
  fuelGaugeLevel: string;
  fuelGaugePhotoUrl: string; // Base64 or local URL representation
  hasSpareTire: boolean;
  hasJack: boolean;
  hasBrokenGlass: boolean;
  tireConditionFrontLeft: string;
  tireConditionFrontRight: string;
  tireConditionRearLeft: string;
  tireConditionRearRight: string;
  odometer: number;
  photoUrls: string[];
  comments: string | null;
  queuedAt: number;
}

interface FleetVaultDB extends DBSchema {
  'inspections-queue': {
    key: string;
    value: OfflineInspection;
  };
}

const DB_NAME = 'fleetvault-offline-db';
const STORE_NAME = 'inspections-queue';

export async function initDb() {
  return openDB<FleetVaultDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function queueOfflineInspection(inspection: Omit<OfflineInspection, 'id' | 'queuedAt'>) {
  const db = await initDb();
  const id = `offline_insp_${Math.random().toString(36).substring(7)}`;
  const queuedItem: OfflineInspection = {
    ...inspection,
    id,
    queuedAt: Date.now(),
  };

  await db.put(STORE_NAME, queuedItem);
  console.log('[IndexedDB] Queued offline inspection', id);
  return id;
}

export async function getQueuedInspections() {
  const db = await initDb();
  return await db.getAll(STORE_NAME);
}

export async function removeQueuedInspection(id: string) {
  const db = await initDb();
  await db.delete(STORE_NAME, id);
  console.log('[IndexedDB] Removed queued inspection', id);
}

// Function to process/sync all offline queued inspections
export async function syncQueuedInspections(uploadFn: (inspection: any) => Promise<any>) {
  const queued = await getQueuedInspections();
  if (queued.length === 0) return { success: true, count: 0 };

  console.log(`[Offline Sync] Starting sync for ${queued.length} items...`);
  let syncedCount = 0;
  let errors = [];

  for (const item of queued) {
    try {
      // 1. If the fuel gauge photo url is a base64 string, we would ideally upload it first.
      // But since we can handle it directly or via /api/uploads, we upload.
      // If uploadFn resolves successfully, we remove it from queue.
      await uploadFn(item);
      await removeQueuedInspection(item.id);
      syncedCount++;
    } catch (err: any) {
      console.error(`[Offline Sync] Sync failed for inspection ${item.id}:`, err);
      errors.push({ id: item.id, error: err.message || err });
    }
  }

  return {
    success: errors.length === 0,
    count: syncedCount,
    errors,
  };
}
