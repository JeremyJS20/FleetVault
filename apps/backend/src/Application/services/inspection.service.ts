import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError, ValidationError } from '../../Domain/errors/index.js';

export class InspectionService {
  async createInspection(input: {
    rentalId: string;
    type: 'PICKUP' | 'RETURN';
    employeeId: string;
    hasScratches: boolean;
    fuelGaugeLevel: string;
    missingSpareTire: boolean;
    missingJack: boolean;
    hasBrokenGlass: boolean;
    tireConditionFrontLeft: string;
    tireConditionFrontRight: string;
    tireConditionRearLeft: string;
    tireConditionRearRight: string;
    odometer: number;
    photoUrls?: string[];
    comments?: string | null;
  }) {
    // 1. Fetch rental with vehicle
    const rental = await prisma.rental.findUnique({
      where: { id: input.rentalId },
      include: { vehicle: true, customer: true }
    });
    if (!rental) {
      throw new NotFoundError('Rental not found');
    }

    // 2. Validate rental status based on inspection type
    if (input.type === 'PICKUP' && rental.status !== 'PENDING') {
      throw new ValidationError('Pickup inspections can only be performed on pending rentals');
    }
    if (input.type === 'RETURN' && rental.status !== 'ACTIVE') {
      throw new ValidationError('Return inspections can only be performed on active rentals');
    }

    // 3. Vehicle accessibility check for PICKUP
    if (input.type === 'PICKUP') {
      const vStatus = rental.vehicle.status;
      if (vStatus === 'UNDER_INSPECTION' || vStatus === 'MAINTENANCE') {
        throw new ValidationError('Vehicle is not available for pickup inspection');
      }
    }

    // 4. Prevent duplicate PICKUP inspection per rental
    if (input.type === 'PICKUP') {
      const existing = await prisma.inspection.findFirst({
        where: { rentalId: input.rentalId, type: 'PICKUP' }
      });
      if (existing) {
        throw new ValidationError('A pickup inspection already exists for this rental');
      }
    }

    // 5. Validate odometer against current vehicle odometer
    if (input.odometer < rental.vehicle.odometer) {
      throw new ValidationError(`Odometer reading (${input.odometer}) cannot be less than the vehicle's current odometer (${rental.vehicle.odometer})`);
    }

    // 6. Validate employee
    const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const vehicle = rental.vehicle;

    // 7. Determine inspection status
    const isTireDamaged = (cond: string) => cond === 'DAMAGED' || cond === 'MISSING';
    const hasTireIssue = isTireDamaged(input.tireConditionFrontLeft) ||
                         isTireDamaged(input.tireConditionFrontRight) ||
                         isTireDamaged(input.tireConditionRearLeft) ||
                         isTireDamaged(input.tireConditionRearRight);

    const isFlagged = input.hasBrokenGlass ||
                      input.missingSpareTire ||
                      input.missingJack ||
                      hasTireIssue ||
                      input.hasScratches;

    const status = isFlagged ? 'FLAGGED' : 'PASSED';

    // 8. Save inspection and update vehicle in a transaction
    return await prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.create({
        data: {
          rentalId: input.rentalId,
          type: input.type,
          vehicleId: rental.vehicleId,
          customerId: rental.customerId,
          employeeId: input.employeeId,
          hasScratches: input.hasScratches,
          fuelGaugeLevel: input.fuelGaugeLevel,
          missingSpareTire: input.missingSpareTire,
          missingJack: input.missingJack,
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
          vehicle: {
            include: { brand: true, model: true, vehicleType: true }
          },
          customer: true,
          employee: true
        }
      });

      if (input.type === 'RETURN') {
        let newVehicleStatus = vehicle.status;
        if (isFlagged) {
          newVehicleStatus = 'MAINTENANCE';
        } else if (vehicle.status === 'UNDER_INSPECTION') {
          newVehicleStatus = 'AVAILABLE';
        }

        await tx.vehicle.update({
          where: { id: rental.vehicleId },
          data: {
            odometer: input.odometer,
            status: newVehicleStatus
          }
        });
      }

      return inspection;
    });
  }

  async getInspectionById(id: string) {
    const item = await prisma.inspection.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: { brand: true, model: true, vehicleType: true }
        },
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

  async listInspections(filters: { vehicleId?: string; customerId?: string; employeeId?: string; search?: string; type?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search } },
        { comments: { contains: filters.search } },
        { vehicle: { plateNumber: { contains: filters.search } } },
        { customer: { name: { contains: filters.search } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: {
            include: { brand: true, model: true, vehicleType: true }
          },
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
