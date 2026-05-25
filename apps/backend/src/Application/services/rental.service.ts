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
  private async loadFeeMap(): Promise<Record<string, number>> {
    const fees = await prisma.feeConfig.findMany();
    const map: Record<string, number> = {};
    for (const fee of fees) {
      map[fee.key] = fee.amount;
    }
    return map;
  }

  private validateCustomerProfileComplete(customer: any, scheduledReturnDate: Date) {
    if (customer.type === 'CORPORATE') {
      return;
    }
    const missingFields: string[] = [];
    if (!customer.nationalId) missingFields.push('nationalId');
    if (!customer.licenseNumber) missingFields.push('licenseNumber');
    if (!customer.licenseCountry) missingFields.push('licenseCountry');
    if (!customer.licenseExpDate) missingFields.push('licenseExpDate');

    if (missingFields.length > 0) {
      throw new ValidationError(`Customer profile is incomplete. Missing fields: ${missingFields.join(', ')}`);
    }

    const expDate = new Date(customer.licenseExpDate);
    if (expDate <= scheduledReturnDate) {
      throw new ValidationError(`Customer driver's license will expire before or on the scheduled return date (License expires: ${expDate.toLocaleDateString()}, Scheduled Return: ${scheduledReturnDate.toLocaleDateString()})`);
    }
  }

  async activateReservation(rentalId: string, input: {
    signatureUrl: string;
    checkoutEmployeeId: string;
    driverName?: string | null;
    driverLicenseNumber?: string | null;
    driverLicenseCountry?: string | null;
    driverLicenseExpDate?: string | null;
    driverLicensePhotoUrl?: string | null;
  }) {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { vehicle: true, customer: true }
    });

    if (!rental) {
      throw new NotFoundError('Reservation not found');
    }

    if (rental.status !== 'PENDING') {
      throw new ValidationError(`Cannot activate reservation in ${rental.status} status`);
    }

    // Gate: pickup inspection required before checkout
    const pickupInspection = await prisma.inspection.findFirst({
      where: { rentalId, type: 'PICKUP' }
    });
    if (!pickupInspection) {
      throw new ValidationError('A pickup inspection is required before checkout');
    }

    // Gate: vehicle must not be in a blocked state
    if (rental.vehicle.status === 'UNDER_INSPECTION' || rental.vehicle.status === 'MAINTENANCE') {
      throw new ValidationError('Vehicle is not available for checkout');
    }

    if (!rental.customer) {
      throw new NotFoundError('Customer not found for this reservation');
    }

    this.validateCustomerProfileComplete(rental.customer, rental.scheduledReturnDate);

    // Gate: customer must not have another active rental
    const activeRental = await prisma.rental.findFirst({
      where: { customerId: rental.customerId, status: 'ACTIVE' }
    });
    if (activeRental) {
      throw new ConflictError('Customer already has an active rental');
    }

    // Corporate credit limit verification
    if (rental.customer.type === 'CORPORATE') {
      if (!rental.purchaseOrderNumber) {
        throw new ValidationError('Purchase Order number is required for corporate accounts');
      }

      const outstandingSum = await prisma.rental.aggregate({
        where: {
          customerId: rental.customerId,
          id: { not: rentalId },
          status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] }
        },
        _sum: {
          totalCost: true
        }
      });
      const outstandingCost = outstandingSum._sum.totalCost || 0;
      const currentCost = rental.totalCost || 0;

      if (currentCost + outstandingCost > rental.customer.creditLimit) {
        throw new ValidationError(`Corporate credit limit exceeded. Remaining limit: RD$${rental.customer.creditLimit - outstandingCost}, requested: RD$${currentCost}`);
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update Rental to ACTIVE
      const updatedRental = await tx.rental.update({
        where: { id: rentalId },
        data: {
          status: 'ACTIVE',
          checkoutOdometer: pickupInspection.odometer,
          checkoutFuelLevel: pickupInspection.fuelGaugeLevel,
          signatureUrl: input.signatureUrl,
          checkoutEmployeeId: input.checkoutEmployeeId,
          driverName: input.driverName ?? rental.customer.name,
          driverLicenseNumber: input.driverLicenseNumber ?? rental.customer.licenseNumber,
          driverLicenseCountry: input.driverLicenseCountry ?? rental.customer.licenseCountry,
          driverLicenseExpDate: input.driverLicenseExpDate
            ? new Date(input.driverLicenseExpDate)
            : rental.customer.licenseExpDate,
          driverLicensePhotoUrl: input.driverLicensePhotoUrl ?? rental.customer.licensePhotoUrl,
        }
      });

      // 2. Update vehicle status to RENTED
      await tx.vehicle.update({
        where: { id: rental.vehicleId },
        data: {
          status: 'RENTED',
          odometer: pickupInspection.odometer
        }
      });

      return updatedRental;
    });
  }

  async createWalkInRental(input: {
    customerId: string;
    checkoutEmployeeId: string;
    vehicleId: string;
    rentalDate: string;
    scheduledReturnDate: string;
    pricePerDay: number;
    checkoutOdometer?: number;
    checkoutFuelLevel?: string;
    signatureUrl: string;
    comments?: string | null;
    stripePaymentMethodId?: string | null;
    paymentMethod?: 'STRIPE' | 'CASH' | null;
    purchaseOrderNumber?: string | null;
    driverName?: string | null;
    driverLicenseNumber?: string | null;
    driverLicenseCountry?: string | null;
    driverLicenseExpDate?: string | null;
    driverLicensePhotoUrl?: string | null;
    hasScratches?: boolean;
    hasBrokenGlass?: boolean;
    missingSpareTire?: boolean;
    missingJack?: boolean;
    tireConditionFrontLeft?: string;
    tireConditionFrontRight?: string;
    tireConditionRearLeft?: string;
    tireConditionRearRight?: string;
    photoUrls?: string[];
    inspectionComments?: string | null;
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

    this.validateCustomerProfileComplete(customer, end);

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays || 1;

    const pricePerDay = input.pricePerDay;
    const totalCost = parseFloat((pricePerDay * days).toFixed(2));
    const feeMap = await this.loadFeeMap();
    const depositAmount = feeMap['SECURITY_DEPOSIT'] ?? 15000;
    const holdAmount = totalCost + depositAmount;

    const result = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!vehicle) throw new NotFoundError('Vehicle not found');
      if (vehicle.status !== 'AVAILABLE') throw new ValidationError('Vehicle is not available');

      const checkoutOdometer = input.checkoutOdometer ?? vehicle.odometer;
      const checkoutFuelLevel = input.checkoutFuelLevel ?? 'FULL';
      if (checkoutOdometer < vehicle.odometer) {
        throw new ValidationError(`Checkout odometer (${checkoutOdometer}) cannot be less than current odometer (${vehicle.odometer})`);
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

      // Gate: customer must not have another active rental
      const customerActive = await tx.rental.findFirst({
        where: { customerId: input.customerId, status: 'ACTIVE' }
      });
      if (customerActive) throw new ConflictError('Customer already has an active rental');

      // Corporate credit limit verification
      if (customer.type === 'CORPORATE') {
        if (!input.purchaseOrderNumber) {
          throw new ValidationError('Purchase Order number is required for corporate accounts');
        }

        const outstandingSum = await tx.rental.aggregate({
          where: {
            customerId: customer.id,
            status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] }
          },
          _sum: {
            totalCost: true
          }
        });
        const outstandingCost = outstandingSum._sum.totalCost || 0;

        if (totalCost + outstandingCost > customer.creditLimit) {
          throw new ValidationError(`Corporate credit limit exceeded. Remaining limit: RD$${customer.creditLimit - outstandingCost}, requested: RD$${totalCost}`);
        }
      }

      return { vehicle, totalCost, holdAmount, depositAmount, checkoutOdometer, checkoutFuelLevel };
    });

    // Stripe Hold (only if not corporate and paymentMethod is STRIPE)
    let holdId: string | null = null;
    const isCorporate = customer.type === 'CORPORATE';
    const isCash = !isCorporate && input.paymentMethod === 'CASH';

    if (!isCorporate && !isCash) {
      if (!input.stripePaymentMethodId) {
        throw new ValidationError('Stripe payment method is required for credit card checkout');
      }
      const metadata = {
        customerId: customer.id,
        customerName: customer.name,
        vehiclePlate: result.vehicle.plateNumber,
        walkin: 'true'
      };
      const hold = await stripeService.createPreAuthHold(
        result.holdAmount,
        customer.stripeCustomerId || undefined,
        input.stripePaymentMethodId,
        metadata
      );
      holdId = hold.id;
    }

    return await prisma.$transaction(async (tx) => {
      const rental = await tx.rental.create({
        data: {
          customerId: input.customerId,
          checkoutEmployeeId: input.checkoutEmployeeId,
          vehicleId: input.vehicleId,
          rentalDate: start,
          scheduledReturnDate: end,
          pricePerDay,
          checkoutOdometer: result.checkoutOdometer,
          checkoutFuelLevel: result.checkoutFuelLevel,
          status: 'ACTIVE',
          signatureUrl: input.signatureUrl || null,
          stripePaymentIntentId: holdId,
          purchaseOrderNumber: isCorporate ? input.purchaseOrderNumber : null,
          driverName: input.driverName ?? customer.name,
          driverLicenseNumber: input.driverLicenseNumber ?? customer.licenseNumber,
          driverLicenseCountry: input.driverLicenseCountry ?? customer.licenseCountry,
          driverLicenseExpDate: input.driverLicenseExpDate
            ? new Date(input.driverLicenseExpDate)
            : customer.licenseExpDate,
          driverLicensePhotoUrl: input.driverLicensePhotoUrl ?? customer.licensePhotoUrl,
          totalCost: result.totalCost,
          comments: input.comments
        }
      });

      await tx.vehicle.update({
        where: { id: input.vehicleId },
        data: {
          status: 'RENTED',
          odometer: result.checkoutOdometer
        }
      });

      const isTireDamaged = (cond: string) => cond === 'DAMAGED' || cond === 'MISSING';
      const hasTireIssue = isTireDamaged(input.tireConditionFrontLeft || 'GOOD') ||
                           isTireDamaged(input.tireConditionFrontRight || 'GOOD') ||
                           isTireDamaged(input.tireConditionRearLeft || 'GOOD') ||
                           isTireDamaged(input.tireConditionRearRight || 'GOOD');

      const isFlagged = input.hasBrokenGlass ||
                        input.missingSpareTire ||
                        input.missingJack ||
                        hasTireIssue ||
                        input.hasScratches;

      const inspection = await tx.inspection.create({
        data: {
          rentalId: rental.id,
          type: 'PICKUP',
          vehicleId: input.vehicleId,
          customerId: input.customerId,
          employeeId: input.checkoutEmployeeId,
          hasScratches: input.hasScratches ?? false,
          fuelGaugeLevel: result.checkoutFuelLevel,
          missingSpareTire: input.missingSpareTire ?? false,
          missingJack: input.missingJack ?? false,
          hasBrokenGlass: input.hasBrokenGlass ?? false,
          tireConditionFrontLeft: input.tireConditionFrontLeft ?? 'GOOD',
          tireConditionFrontRight: input.tireConditionFrontRight ?? 'GOOD',
          tireConditionRearLeft: input.tireConditionRearLeft ?? 'GOOD',
          tireConditionRearRight: input.tireConditionRearRight ?? 'GOOD',
          odometer: result.checkoutOdometer,
          photoUrlsJson: JSON.stringify(input.photoUrls || []),
          status: isFlagged ? 'FLAGGED' : 'PASSED',
          comments: input.inspectionComments || null
        }
      });

      // Transaction Ledger entry based on billing type
      let ledgerType = 'PRE_AUTH_HOLD';
      let ledgerAmount = result.holdAmount;
      let ledgerComments = `Counter pre-auth hold of RD$${result.holdAmount} (Rent: RD$${result.totalCost} + Deposit: RD$${result.depositAmount})`;

      if (isCorporate) {
        ledgerType = 'PO_INVOICE';
        ledgerAmount = result.totalCost;
        ledgerComments = `Corporate invoice under PO ${input.purchaseOrderNumber} for RD$${result.totalCost}`;
      } else if (isCash) {
        ledgerType = 'CASH';
        ledgerAmount = result.holdAmount;
        ledgerComments = `Upfront cash payment collected for RD$${result.holdAmount} (Rent: RD$${result.totalCost} + Deposit: RD$${result.depositAmount})`;
      }

      await tx.transactionLedger.create({
        data: {
          rentalId: rental.id,
          amount: ledgerAmount,
          type: ledgerType,
          stripePaymentIntentId: holdId,
          purchaseOrderNumber: isCorporate ? input.purchaseOrderNumber : null,
          comments: ledgerComments
        }
      });

      return { rental, inspection };
    });
  }

  async updateRental(id: string, input: { signatureUrl?: string; driverLicensePhotoUrl?: string }) {
    return prisma.rental.update({
      where: { id },
      data: {
        ...(input.signatureUrl !== undefined ? { signatureUrl: input.signatureUrl } : {}),
        ...(input.driverLicensePhotoUrl !== undefined ? { driverLicensePhotoUrl: input.driverLicensePhotoUrl } : {}),
      },
    });
  }

  async calculatePenalties(rentalId: string, returnInput: {
    actualReturnDate: string;
  }): Promise<ReturnCalculations> {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { vehicle: true }
    });

    if (!rental) {
      throw new NotFoundError('Rental not found');
    }

    const returnInsp = await prisma.inspection.findFirst({
      where: { rentalId, type: 'RETURN' }
    });
    if (!returnInsp) {
      throw new ValidationError('A RETURN inspection must be completed before estimating penalties');
    }

    const pickupInsp = await prisma.inspection.findFirst({
      where: { rentalId, type: 'PICKUP' }
    });

    const tirePositions = ['tireConditionFrontLeft', 'tireConditionFrontRight', 'tireConditionRearLeft', 'tireConditionRearRight'] as const;
    const isDamaged = (cond: string) => cond === 'DAMAGED' || cond === 'MISSING';

    const actualReturn = new Date(returnInput.actualReturnDate);
    const feeMap = await this.loadFeeMap();

    // 1. Base Rental cost
    const baseCost = rental.totalCost || 0.0;

    // 2. Late fees
    const lateFeePerHour = feeMap['LATE_FEE_PER_HOUR'] ?? 1500;
    let lateHours = 0;
    let lateFee = 0;
    if (actualReturn > rental.scheduledReturnDate) {
      const diffMs = actualReturn.getTime() - rental.scheduledReturnDate.getTime();
      lateHours = diffMs / (1000 * 60 * 60);
      if (lateHours > 1.0) {
        lateFee = parseFloat((lateHours * lateFeePerHour).toFixed(2));
      }
    }

    // 3. Fuel Penalty: Refueling service flat fee + per step missing
    const fuelFlatFee = feeMap['FUEL_FLAT_FEE'] ?? 2000;
    const fuelPerStep = feeMap['FUEL_PER_STEP'] ?? 1000;
    const checkoutVal = FUEL_VALUES[rental.checkoutFuelLevel] ?? 4;
    const returnVal = FUEL_VALUES[returnInsp.fuelGaugeLevel] ?? 4;
    const fuelDifference = Math.max(0, checkoutVal - returnVal);
    let fuelFee = 0;
    if (fuelDifference > 0) {
      fuelFee = fuelFlatFee + (fuelDifference * fuelPerStep);
    }

    // 4. Damage Fees — only charge for NEW damage (not pre-existing at checkout)
    const glassFeeAmount = feeMap['GLASS_DAMAGE'] ?? 12000;
    const scratchesFeeAmount = feeMap['SCRATCHES'] ?? 8000;
    const tireFeeAmount = feeMap['TIRE_DAMAGE'] ?? 5000;
    const glassFee = returnInsp.hasBrokenGlass && !pickupInsp?.hasBrokenGlass ? glassFeeAmount : 0.0;
    const scratchesFee = returnInsp.hasScratches && !pickupInsp?.hasScratches ? scratchesFeeAmount : 0.0;
    const newTiresCount = tirePositions.filter(p =>
      isDamaged(returnInsp[p]) && !isDamaged(pickupInsp?.[p] ?? 'GOOD')
    ).length;
    const tiresFee = newTiresCount * tireFeeAmount;
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
    returnSignatureUrl: string;
    returnEmployeeId: string;
    comments?: string | null;
  }) {
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { vehicle: true, customer: true }
    });

    if (!rental) throw new NotFoundError('Rental contract not found');
    if (rental.status !== 'ACTIVE') throw new ValidationError(`Cannot return a rental that is in ${rental.status} status`);

    const returnInspection = await prisma.inspection.findFirst({
      where: { rentalId, type: 'RETURN' }
    });
    if (!returnInspection) {
      throw new ValidationError('A RETURN inspection must be completed before processing the return');
    }

    if (returnInspection.odometer < rental.checkoutOdometer) {
      throw new ValidationError(`Return odometer (${returnInspection.odometer}) cannot be less than checkout odometer (${rental.checkoutOdometer})`);
    }

    const pickupInsp = await prisma.inspection.findFirst({
      where: { rentalId, type: 'PICKUP' }
    });

    const tirePositions = ['tireConditionFrontLeft', 'tireConditionFrontRight', 'tireConditionRearLeft', 'tireConditionRearRight'] as const;
    const isDamaged = (cond: string) => cond === 'DAMAGED' || cond === 'MISSING';
    const newTiresCount = tirePositions.filter(p =>
      isDamaged(returnInspection[p]) && !isDamaged(pickupInsp?.[p] ?? 'GOOD')
    ).length;

    // 1. Calculate final costs and fees
    const calcs = await this.calculatePenalties(rentalId, input);

    const checkoutLedger = await prisma.transactionLedger.findFirst({
      where: { rentalId, type: { in: ['PRE_AUTH_HOLD', 'CASH', 'PO_INVOICE'] } }
    });
    const isCash = checkoutLedger?.type === 'CASH';
    const isCorporate = rental.customer.type === 'CORPORATE';

    // 2. Stripe charge / hold capture (only if stripe pre-auth hold exists, i.e., individual + credit card)
    if (rental.stripePaymentIntentId && !isCash && !isCorporate) {
      try {
        // Capture what is needed from pre-auth hold. Stripe capture allows capturing up to the authorized amount.
        // If final cost <= authorized, capture final cost. If final cost > authorized, capture full and charge extra.
        const feeMap = await this.loadFeeMap();
        const depositAmount = feeMap['SECURITY_DEPOSIT'] ?? 15000;
        const authAmount = (rental.totalCost || 0.0) + depositAmount;
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
      let ledgerType = 'CHARGE';
      let ledgerComments = `Final check-in charge of RD$${calcs.totalFinalCost} (Rent: RD$${calcs.baseCost}, Late Fee: RD$${calcs.lateFee}, Fuel Fee: RD$${calcs.fuelFee}, Damage Fee: RD$${calcs.totalDamageFee})`;
      
      if (isCorporate) {
        ledgerType = 'PO_INVOICE';
        ledgerComments = `Corporate invoice return check-in under PO ${rental.purchaseOrderNumber} for RD$${calcs.totalFinalCost} (Rent: RD$${calcs.baseCost}, Late Fee: RD$${calcs.lateFee}, Fuel Fee: RD$${calcs.fuelFee}, Damage Fee: RD$${calcs.totalDamageFee})`;
      } else if (isCash) {
        ledgerType = 'CASH';
        // Calculate cash reconciliation adjustments
        const initialCashPaid = checkoutLedger?.amount || 0;
        const diff = initialCashPaid - calcs.totalFinalCost;
        if (diff >= 0) {
          ledgerComments = `Cash return check-in completed. Refunded RD$${diff.toFixed(2)} in cash (Initial: RD$${initialCashPaid}, Final Cost: RD$${calcs.totalFinalCost})`;
        } else {
          ledgerComments = `Cash return check-in completed. Collected additional RD$${Math.abs(diff).toFixed(2)} in cash (Initial: RD$${initialCashPaid}, Final Cost: RD$${calcs.totalFinalCost})`;
        }
      }

      // Create ledger charge record
      await tx.transactionLedger.create({
        data: {
          rentalId: rentalId,
          amount: calcs.totalFinalCost,
          type: ledgerType,
          stripePaymentIntentId: isCorporate || isCash ? null : rental.stripePaymentIntentId,
          purchaseOrderNumber: isCorporate ? rental.purchaseOrderNumber : null,
          comments: ledgerComments
        }
      });

      // Update vehicle status
      // Only flag MAINTENANCE for NEW damage (not pre-existing at checkout)
      const hasNewDamage = returnInspection.hasBrokenGlass && !pickupInsp?.hasBrokenGlass ||
                           returnInspection.hasScratches && !pickupInsp?.hasScratches ||
                           newTiresCount > 0;
      const vehicleStatus = hasNewDamage ? 'MAINTENANCE' : 'UNDER_INSPECTION';

      await tx.vehicle.update({
        where: { id: rental.vehicleId },
        data: {
          odometer: returnInspection.odometer,
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
          returnOdometer: returnInspection.odometer,
          returnFuelLevel: returnInspection.fuelGaugeLevel,
          returnSignatureUrl: input.returnSignatureUrl,
          returnEmployeeId: input.returnEmployeeId,
          totalCost: calcs.totalFinalCost,
          comments: input.comments || `Returned successfully. Penalties applied: RD$${calcs.totalFinalCost - calcs.baseCost}`
        },
        include: {
          vehicle: true,
          customer: true
        }
      });
    });
  }

  async listRentals(filters: { status?: string; customerId?: string; checkoutEmployeeId?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.checkoutEmployeeId) where.checkoutEmployeeId = filters.checkoutEmployeeId;

    const [items, total, outstandingAgg] = await Promise.all([
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
          checkoutEmployee: true,
          returnEmployee: true,
          transactions: true,
          inspections: {
            select: {
              type: true,
              odometer: true,
              fuelGaugeLevel: true,
              hasBrokenGlass: true,
              hasScratches: true,
              tireConditionFrontLeft: true,
              tireConditionFrontRight: true,
              tireConditionRearLeft: true,
              tireConditionRearRight: true,
              missingSpareTire: true,
              missingJack: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.rental.count({ where }),
      prisma.rental.groupBy({
        by: ['customerId'],
        where: { status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] } },
        _sum: { totalCost: true }
      })
    ]);

    const outstandingByCustomer: Record<string, number> = {};
    for (const row of outstandingAgg) {
      outstandingByCustomer[row.customerId] = row._sum.totalCost || 0;
    }

    const itemsWithOutstanding = items.map(r => ({
      ...r,
      customer: {
        ...r.customer,
        outstandingBalance: outstandingByCustomer[r.customerId] || 0
      }
    }));

    return { items: itemsWithOutstanding, total, page, limit, pages: Math.ceil(total / limit) };
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
        checkoutEmployee: true,
        returnEmployee: true,
        transactions: true,
        inspections: true
      }
    });

    if (!item) throw new NotFoundError('Rental record not found');
    return item;
  }
}
