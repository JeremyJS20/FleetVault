import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError, ValidationError, ConflictError } from '../../Domain/errors/index.js';
import { StripeService } from './stripe.service.js';

const stripeService = new StripeService();

const FUEL_VALUES: Record<string, number> = {
  'EMPTY': 0,
  'QUARTER': 1,
  'HALF': 2,
  'THREE_QUARTERS': 3,
  'FULL': 4
};

export interface ReturnCalculations {
  baseCost: number;
  lateHours: number;
  lateFee: number;
  fuelDifference: number;
  fuelFee: number;
  glassFee: number;
  scratchesFee: number;
  tiresFee: number;
  totalDamageFee: number;
  totalFinalCost: number;
}

export class RentalService {
  async activateReservation(rentalId: string, input: {
    checkoutOdometer: number;
    checkoutFuelLevel: string;
    signatureUrl: string;
    employeeId: string;
  }) {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { vehicle: true }
    });

    if (!rental) {
      throw new NotFoundError('Reservation not found');
    }

    if (rental.status !== 'PENDING') {
      throw new ValidationError(`Cannot activate reservation in ${rental.status} status`);
    }

    if (input.checkoutOdometer < rental.vehicle.odometer) {
      throw new ValidationError(`Checkout odometer cannot be less than current vehicle odometer (${rental.vehicle.odometer})`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update Rental to ACTIVE
      const updatedRental = await tx.rental.update({
        where: { id: rentalId },
        data: {
          status: 'ACTIVE',
          checkoutOdometer: input.checkoutOdometer,
          checkoutFuelLevel: input.checkoutFuelLevel,
          signatureUrl: input.signatureUrl,
          employeeId: input.employeeId
        }
      });

      // 2. Update vehicle status to RENTED
      await tx.vehicle.update({
        where: { id: rental.vehicleId },
        data: {
          status: 'RENTED',
          odometer: input.checkoutOdometer
        }
      });

      return updatedRental;
    });
  }

  async createWalkInRental(input: {
    customerId: string;
    employeeId: string;
    vehicleId: string;
    rentalDate: string;
    scheduledReturnDate: string;
    pricePerDay: number;
    checkoutOdometer: number;
    checkoutFuelLevel: string;
    signatureUrl: string;
    comments?: string | null;
    stripePaymentMethodId: string; // for direct pre-auth hold
  }) {
    const start = new Date(input.rentalDate);
    const end = new Date(input.scheduledReturnDate);
    const now = new Date();

    if (start > end) {
      throw new ValidationError('Return date must be after or equal to start date');
    }

    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new NotFoundError('Customer not found');
    if (customer.status !== 'ACTIVE') throw new ValidationError('Customer profile is suspended');

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays || 1;

    const pricePerDay = input.pricePerDay;
    const totalCost = parseFloat((pricePerDay * days).toFixed(2));
    const holdAmount = totalCost + 200.0;

    const result = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle) throw new NotFoundError('Vehicle not found');
      if (vehicle.status !== 'AVAILABLE') throw new ValidationError('Vehicle is not available');
      if (input.checkoutOdometer < vehicle.odometer) {
        throw new ValidationError(`Checkout odometer cannot be less than current odometer (${vehicle.odometer})`);
      }

      // Check date conflicts
      const conflict = await tx.rental.findFirst({
        where: {
          vehicleId: input.vehicleId,
          status: { in: ['PENDING', 'ACTIVE'] },
          rentalDate: { lte: end },
          scheduledReturnDate: { gte: start }
        }
      });
      if (conflict) throw new ConflictError('Vehicle is booked for these dates');

      return { vehicle, totalCost, holdAmount };
    });

    // Stripe Hold
    const metadata = {
      customerId: customer.id,
      customerName: customer.name,
      vehiclePlate: result.vehicle.plateNumber,
      walkin: 'true'
    };
    const hold = await stripeService.createPreAuthHold(result.holdAmount, undefined, metadata);

    return await prisma.$transaction(async (tx) => {
      const rental = await tx.rental.create({
        data: {
          customerId: input.customerId,
          employeeId: input.employeeId,
          vehicleId: input.vehicleId,
          rentalDate: start,
          scheduledReturnDate: end,
          pricePerDay,
          checkoutOdometer: input.checkoutOdometer,
          checkoutFuelLevel: input.checkoutFuelLevel,
          status: 'ACTIVE',
          signatureUrl: input.signatureUrl,
          stripePaymentIntentId: hold.id,
          totalCost: result.totalCost,
          comments: input.comments
        }
      });

      await tx.vehicle.update({
        where: { id: input.vehicleId },
        data: {
          status: 'RENTED',
          odometer: input.checkoutOdometer
        }
      });

      await tx.transactionLedger.create({
        data: {
          rentalId: rental.id,
          amount: result.holdAmount,
          type: 'PRE_AUTH_HOLD',
          stripePaymentIntentId: hold.id,
          comments: `Counter pre-auth hold of $${result.holdAmount}`
        }
      });

      return rental;
    });
  }

  async calculatePenalties(rentalId: string, returnInput: {
    actualReturnDate: string;
    returnOdometer: number;
    returnFuelLevel: string;
    hasBrokenGlass: boolean;
    damagedTiresCount: number;
    hasNewScratches: boolean;
  }): Promise<ReturnCalculations> {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { vehicle: true }
    });

    if (!rental) {
      throw new NotFoundError('Rental not found');
    }

    const actualReturn = new Date(returnInput.actualReturnDate);

    // 1. Base Rental cost
    const baseCost = rental.totalCost || 0.0;

    // 2. Late fees: $30 per hour after scheduled return date (with 1 hour grace period)
    let lateHours = 0;
    let lateFee = 0;
    if (actualReturn > rental.scheduledReturnDate) {
      const diffMs = actualReturn.getTime() - rental.scheduledReturnDate.getTime();
      lateHours = diffMs / (1000 * 60 * 60);
      if (lateHours > 1.0) {
        lateFee = parseFloat((lateHours * 30.00).toFixed(2));
      }
    }

    // 3. Fuel Penalty: Refueling service flat fee of $30 + $25 per step missing
    const checkoutVal = FUEL_VALUES[rental.checkoutFuelLevel] ?? 4;
    const returnVal = FUEL_VALUES[returnInput.returnFuelLevel] ?? 4;
    const fuelDifference = Math.max(0, checkoutVal - returnVal);
    let fuelFee = 0;
    if (fuelDifference > 0) {
      fuelFee = 30.00 + (fuelDifference * 25.00);
    }

    // 4. Damage Fees
    const glassFee = returnInput.hasBrokenGlass ? 300.00 : 0.0;
    const scratchesFee = returnInput.hasNewScratches ? 150.00 : 0.0;
    const tiresFee = (returnInput.damagedTiresCount || 0) * 100.00;
    const totalDamageFee = glassFee + scratchesFee + tiresFee;

    const totalFinalCost = parseFloat((baseCost + lateFee + fuelFee + totalDamageFee).toFixed(2));

    return {
      baseCost,
      lateHours,
      lateFee,
      fuelDifference,
      fuelFee,
      glassFee,
      scratchesFee,
      tiresFee,
      totalDamageFee,
      totalFinalCost
    };
  }

  async processReturn(rentalId: string, input: {
    actualReturnDate: string;
    returnOdometer: number;
    returnFuelLevel: string;
    returnSignatureUrl: string;
    comments?: string | null;
    hasBrokenGlass: boolean;
    damagedTiresCount: number;
    hasNewScratches: boolean;
  }) {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { vehicle: true, customer: true }
    });

    if (!rental) throw new NotFoundError('Rental contract not found');
    if (rental.status !== 'ACTIVE') throw new ValidationError(`Cannot return a rental that is in ${rental.status} status`);

    if (input.returnOdometer < rental.checkoutOdometer) {
      throw new ValidationError(`Return odometer (${input.returnOdometer}) cannot be less than checkout odometer (${rental.checkoutOdometer})`);
    }

    // 1. Calculate final costs and fees
    const calcs = await this.calculatePenalties(rentalId, input);

    // 2. Stripe charge / hold capture
    if (rental.stripePaymentIntentId) {
      try {
        // Capture what is needed from pre-auth hold. Stripe capture allows capturing up to the authorized amount.
        // If final cost <= authorized, capture final cost. If final cost > authorized, capture full and charge extra.
        const authAmount = (rental.totalCost || 0.0) + 200.0;
        const captureAmount = Math.min(calcs.totalFinalCost, authAmount);

        await stripeService.capturePayment(rental.stripePaymentIntentId, captureAmount);

        // If there's remaining balance, charge the card as a second transaction
        if (calcs.totalFinalCost > authAmount) {
          const extra = calcs.totalFinalCost - authAmount;
          // In real Stripe, we'd charge the customer's payment method or create a invoice. Here we mock:
          await stripeService.createCharge(extra, undefined, {
            rentalId: rental.id,
            reason: 'Excess charges and penalties'
          });
        }
      } catch (err) {
        console.error('Stripe capture failed during return check-in, proceeding with local db fallback:', err);
      }
    }

    // 3. Update database record in a transaction
    return await prisma.$transaction(async (tx) => {
      // Create ledger charge record
      await tx.transactionLedger.create({
        data: {
          rentalId: rentalId,
          amount: calcs.totalFinalCost,
          type: 'CHARGE',
          stripePaymentIntentId: rental.stripePaymentIntentId,
          comments: `Final check-in charge of $${calcs.totalFinalCost} (Rent: $${calcs.baseCost}, Late Fee: $${calcs.lateFee}, Fuel Fee: $${calcs.fuelFee}, Damage Fee: $${calcs.totalDamageFee})`
        }
      });

      // Update vehicle status
      // If there is damage, vehicle status goes to MAINTENANCE. If dirty/standard return, goes to UNDER_INSPECTION.
      const hasAnyDamage = input.hasBrokenGlass || input.hasNewScratches || input.damagedTiresCount > 0;
      const vehicleStatus = hasAnyDamage ? 'MAINTENANCE' : 'UNDER_INSPECTION';

      await tx.vehicle.update({
        where: { id: rental.vehicleId },
        data: {
          odometer: input.returnOdometer,
          status: vehicleStatus,
          cleaningStatus: 'DIRTY' // Needs checkup/cleaning before re-lease
        }
      });

      // Update Rental status to COMPLETED
      return await tx.rental.update({
        where: { id: rentalId },
        data: {
          status: 'COMPLETED',
          actualReturnDate: new Date(input.actualReturnDate),
          returnOdometer: input.returnOdometer,
          returnFuelLevel: input.returnFuelLevel,
          returnSignatureUrl: input.returnSignatureUrl,
          totalCost: calcs.totalFinalCost,
          comments: input.comments || `Returned successfully. Penalties applied: $${calcs.totalFinalCost - calcs.baseCost}`
        },
        include: {
          vehicle: true,
          customer: true
        }
      });
    });
  }

  async listRentals(filters: { status?: string; customerId?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;

    const [items, total] = await Promise.all([
      prisma.rental.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: {
            include: {
              brand: true,
              model: true,
              vehicleType: true
            }
          },
          customer: true,
          employee: true
        },
        orderBy: { rentalDate: 'desc' }
      }),
      prisma.rental.count({ where })
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getRentalById(id: string) {
    const item = await prisma.rental.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            brand: true,
            model: true,
            vehicleType: true
          }
        },
        customer: true,
        employee: true,
        transactions: true,
        inspections: true
      }
    });

    if (!item) throw new NotFoundError('Rental record not found');
    return item;
  }
}
