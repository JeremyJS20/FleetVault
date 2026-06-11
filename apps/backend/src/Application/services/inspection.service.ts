import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError, ValidationError } from '../../Domain/errors/index.js';
import type { InspectionDamageInput } from '@rent-car/common';

export class InspectionService {
  async createInspection(input: {
    rentalId: string;
    type: 'PICKUP' | 'RETURN';
    employeeId: string;
    fuelGaugeLevel: string;
    odometer: number;
    damages?: InspectionDamageInput[];
    photoUrls?: string[];
    comments?: string | null;
  }) {
    const rental = await prisma.rental.findUnique({
      where: { id: input.rentalId },
      include: { vehicle: true, customer: true }
    });
    if (!rental) {
      throw new NotFoundError('Rental not found');
    }

    if (input.type === 'PICKUP' && rental.status !== 'PENDING') {
      throw new ValidationError('Pickup inspections can only be performed on pending rentals');
    }
    if (input.type === 'RETURN' && rental.status !== 'ACTIVE') {
      throw new ValidationError('Return inspections can only be performed on active rentals');
    }

    if (input.type === 'PICKUP') {
      const vStatus = rental.vehicle.status;
      if (vStatus === 'UNDER_INSPECTION' || vStatus === 'MAINTENANCE') {
        throw new ValidationError('Vehicle is not available for pickup inspection');
      }
    }

    if (input.type === 'PICKUP') {
      const existing = await prisma.inspection.findFirst({
        where: { rentalId: input.rentalId, type: 'PICKUP' }
      });
      if (existing) {
        throw new ValidationError('A pickup inspection already exists for this rental');
      }
    }

    if (input.odometer < rental.vehicle.odometer) {
      throw new ValidationError(`Odometer reading (${input.odometer}) cannot be less than the vehicle's current odometer (${rental.vehicle.odometer})`);
    }

    const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const vehicle = rental.vehicle;
    const damages = input.damages ?? [];

    const isFlagged = damages.length > 0;
    const status = isFlagged ? 'FLAGGED' : 'PASSED';

    return await prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.create({
        data: {
          rentalId: input.rentalId,
          type: input.type,
          vehicleId: rental.vehicleId,
          customerId: rental.customerId,
          employeeId: input.employeeId,
          fuelGaugeLevel: input.fuelGaugeLevel,
          odometer: input.odometer,
          status: status,
          photoUrlsJson: JSON.stringify(input.photoUrls || []),
          comments: input.comments || null,
          damages: {
            create: damages.map(d => ({
              damageTypeId: d.damageTypeId,
              tirePosition: d.tirePosition ?? null,
            })),
          },
        },
        include: {
          vehicle: {
            include: { brand: true, model: true, vehicleType: true }
          },
          customer: true,
          employee: true,
          damages: true,
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
        employee: true,
        damages: {
          include: { damageType: true }
        },
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
          employee: true,
          damages: {
            include: { damageType: true }
          },
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

  async updateInspectionPhotos(id: string, input: { photoUrls: string[] }) {
    return prisma.inspection.update({
      where: { id },
      data: { photoUrlsJson: JSON.stringify(input.photoUrls) },
    });
  }
}
