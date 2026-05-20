import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError, ValidationError } from '../../Domain/errors/index.js';

export class InspectionService {
  async createInspection(input: {
    rentalId?: string | null;
    vehicleId: string;
    customerId: string;
    employeeId: string;
    hasScratches: boolean;
    fuelGaugeLevel: string;
    fuelGaugePhotoUrl: string;
    hasSpareTire: boolean;
    hasJack: boolean;
    hasBrokenGlass: boolean;
    tireConditionFrontLeft: string;
    tireConditionFrontRight: string;
    tireConditionRearLeft: string;
    tireConditionRearRight: string;
    odometer: number;
    photoUrls?: string[];
    comments?: string | null;
  }) {
    // 1. Fetch vehicle and run odometer checks
    const vehicle = await prisma.vehicle.findUnique({ where: { id: input.vehicleId } });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (input.odometer < vehicle.odometer) {
      throw new ValidationError(`Odometer reading (${input.odometer}) cannot be less than the vehicle's current odometer (${vehicle.odometer})`);
    }

    // 2. Fetch customer and employee checks
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // 3. Determine status of inspection
    // It is FLAGGED if it has broken glass, missing/damaged tires, missing spare/jack, scratches, or comments indicating damage.
    const isTireDamaged = (cond: string) => cond === 'DAMAGED' || cond === 'MISSING';
    const hasTireIssue = isTireDamaged(input.tireConditionFrontLeft) ||
                         isTireDamaged(input.tireConditionFrontRight) ||
                         isTireDamaged(input.tireConditionRearLeft) ||
                         isTireDamaged(input.tireConditionRearRight);

    const isFlagged = input.hasBrokenGlass ||
                      !input.hasSpareTire ||
                      !input.hasJack ||
                      hasTireIssue ||
                      input.hasScratches;

    const status = isFlagged ? 'FLAGGED' : 'PASSED';

    // 4. Save inspection and update vehicle details in a transaction
    return await prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.create({
        data: {
          rentalId: input.rentalId || null,
          vehicleId: input.vehicleId,
          customerId: input.customerId,
          employeeId: input.employeeId,
          hasScratches: input.hasScratches,
          fuelGaugeLevel: input.fuelGaugeLevel,
          fuelGaugePhotoUrl: input.fuelGaugePhotoUrl,
          hasSpareTire: input.hasSpareTire,
          hasJack: input.hasJack,
          hasBrokenGlass: input.hasBrokenGlass,
          tireConditionFrontLeft: input.tireConditionFrontLeft,
          tireConditionFrontRight: input.tireConditionFrontRight,
          tireConditionRearLeft: input.tireConditionRearLeft,
          tireConditionRearRight: input.tireConditionRearRight,
          odometer: input.odometer,
          status: status,
          photoUrlsJson: JSON.stringify(input.photoUrls || []),
          comments: input.comments || null
        },
        include: {
          vehicle: true,
          customer: true,
          employee: true
        }
      });

      // Update vehicle odometer and cleaning status
      // If it is flagged (e.g. damaged), status becomes MAINTENANCE. If not, it becomes AVAILABLE (unless it's rented).
      let newVehicleStatus = vehicle.status;
      if (isFlagged) {
        newVehicleStatus = 'MAINTENANCE';
      } else if (vehicle.status === 'UNDER_INSPECTION') {
        newVehicleStatus = 'AVAILABLE';
      }

      await tx.vehicle.update({
        where: { id: input.vehicleId },
        data: {
          odometer: input.odometer,
          status: newVehicleStatus
        }
      });

      return inspection;
    });
  }

  async getInspectionById(id: string) {
    const item = await prisma.inspection.findUnique({
      where: { id },
      include: {
        vehicle: true,
        customer: true,
        employee: true
      }
    });

    if (!item) {
      throw new NotFoundError('Inspection record not found');
    }

    return {
      ...item,
      photoUrls: JSON.parse(item.photoUrlsJson || '[]') as string[]
    };
  }

  async listInspections(filters: { vehicleId?: string; customerId?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.customerId) where.customerId = filters.customerId;

    const [items, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: true,
          customer: true,
          employee: true
        },
        orderBy: { inspectionDate: 'desc' }
      }),
      prisma.inspection.count({ where })
    ]);

    const formattedItems = items.map(item => ({
      ...item,
      photoUrls: JSON.parse(item.photoUrlsJson || '[]') as string[]
    }));

    return { items: formattedItems, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
