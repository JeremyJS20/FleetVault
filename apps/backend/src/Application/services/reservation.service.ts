import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError, ValidationError, ConflictError } from '../../Domain/errors/index.js';
import { StripeService } from './stripe.service.js';

const stripeService = new StripeService();

export class ReservationService {
  async createReservation(userId: string, input: {
    vehicleId: string;
    rentalDate: string;
    scheduledReturnDate: string;
    stripePaymentMethodId?: string | null;
    purchaseOrderNumber?: string | null;
  }) {
    const start = new Date(input.rentalDate);
    const end = new Date(input.scheduledReturnDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Invalid rental or return date format');
    }

    if (start < now) {
      throw new ValidationError('Rental start date cannot be in the past');
    }

    if (start > end) {
      throw new ValidationError('Return date must be after or equal to start date');
    }

    // 1. Get customer linked to user
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      throw new NotFoundError('Customer profile not found for this user');
    }

    if (customer.status !== 'ACTIVE') {
      throw new ValidationError('Your customer profile is not active or suspended');
    }

    // License expiration check (date-only comparison)
    if (customer.type !== 'CORPORATE' && customer.licenseExpDate) {
      const expDate = new Date(customer.licenseExpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        throw new ValidationError('Your driver\'s license is expired. Please update your profile.');
      }
    }

    // 2. Compute duration in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays || 1;

    // 3. Find default system agent employee to link (schema requires checkoutEmployeeId)
    const defaultEmployee = await prisma.employee.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!defaultEmployee) {
      throw new ValidationError('System is currently unavailable: no active agents registered');
    }

    // 4. Run database transaction to check conflicts and create pending rental contract
    const result = await prisma.$transaction(async (tx) => {
      // Find vehicle
      const vehicle = await tx.vehicle.findUnique({
        where: { id: input.vehicleId },
        include: { vehicleType: true }
      });

      if (!vehicle) {
        throw new NotFoundError('Selected vehicle not found');
      }

      if (vehicle.status !== 'AVAILABLE') {
        throw new ValidationError('Selected vehicle is not available for rental');
      }

      if (vehicle.cleaningStatus !== 'CLEAN') {
        throw new ValidationError('Selected vehicle is dirty and undergoing cleaning');
      }

      // Check overlapping rentals
      const conflict = await tx.rental.findFirst({
        where: {
          vehicleId: input.vehicleId,
          status: { in: ['PENDING', 'ACTIVE'] },
          rentalDate: { lte: end },
          scheduledReturnDate: { gte: start }
        }
      });

      if (conflict) {
        throw new ConflictError('Vehicle has already been booked by another user for these dates');
      }

      // Calculate dynamic price
      const baseDailyRate = vehicle.vehicleType.baseDailyRate || 0;

      // Get seasonal multiplier
      const activeRate = await tx.seasonalRate.findFirst({
        where: {
          status: 'ACTIVE',
          startDate: { lte: end },
          endDate: { gte: start }
        },
        orderBy: { multiplier: 'desc' }
      });

      const multiplier = activeRate ? activeRate.multiplier : 1.0;
      const pricePerDay = parseFloat((baseDailyRate * multiplier).toFixed(2));
      const totalEstimatedCost = parseFloat((pricePerDay * days).toFixed(2));
      
      // Hold amount = Total rental estimate + security deposit
      const depositConfig = await tx.feeConfig.findUnique({ where: { key: 'SECURITY_DEPOSIT' } });
      const depositAmount = depositConfig?.amount ?? 15000;
      const holdAmount = totalEstimatedCost + depositAmount;

      return {
        vehicle,
        pricePerDay,
        totalEstimatedCost,
        depositAmount,
        holdAmount,
        multiplier,
        seasonalName: activeRate ? activeRate.name : null
      };
    });

    // 5. Attach payment method to Stripe customer (if real) & hold
    let holdResultId: string | null = null;

    if (customer.type === 'CORPORATE') {
      if (!input.purchaseOrderNumber) {
        throw new ValidationError('Purchase Order number is required for corporate accounts');
      }

      // Check outstanding balance of pending or active rentals
      const outstandingSum = await prisma.rental.aggregate({
        where: {
          customerId: customer.id,
          status: { in: ['PENDING', 'ACTIVE'] }
        },
        _sum: {
          totalCost: true
        }
      });
      const outstandingCost = outstandingSum._sum.totalCost || 0;

      if (result.totalEstimatedCost + outstandingCost > customer.creditLimit) {
        throw new ValidationError(`Corporate credit limit exceeded. Remaining limit: RD$${customer.creditLimit - outstandingCost}, requested: RD$${result.totalEstimatedCost}`);
      }
    } else {
      if (!input.stripePaymentMethodId) {
        throw new ValidationError('Payment card is required for individual reservations');
      }

      if (customer.stripeCustomerId && !input.stripePaymentMethodId.startsWith('pm_mock_')) {
        await stripeService.attachPaymentMethod(customer.stripeCustomerId, input.stripePaymentMethodId);
      }

      const metadata = {
        customerId: customer.id,
        customerName: customer.name,
        vehiclePlate: result.vehicle.plateNumber,
        dateRange: `${input.rentalDate} to ${input.scheduledReturnDate}`
      };

      const holdResult = await stripeService.createPreAuthHold(
        result.holdAmount,
        customer.stripeCustomerId || undefined,
        input.stripePaymentMethodId,
        metadata
      );
      holdResultId = holdResult.id;
    }

    // 6. Save pending rental and ledger inside a second transaction
    return await prisma.$transaction(async (tx) => {
      const rental = await tx.rental.create({
        data: {
          customerId: customer.id,
          checkoutEmployeeId: defaultEmployee.id,
          vehicleId: input.vehicleId,
          rentalDate: start,
          scheduledReturnDate: end,
          pricePerDay: result.pricePerDay,
          checkoutOdometer: result.vehicle.odometer,
          checkoutFuelLevel: 'FULL',
          status: 'PENDING',
          stripePaymentIntentId: holdResultId,
          purchaseOrderNumber: customer.type === 'CORPORATE' ? input.purchaseOrderNumber : null,
          totalCost: result.totalEstimatedCost
        },
        include: {
          vehicle: {
            include: {
              brand: true,
              model: true,
              vehicleType: true
            }
          }
        }
      });

      await tx.transactionLedger.create({
        data: {
          rentalId: rental.id,
          amount: customer.type === 'CORPORATE' ? result.totalEstimatedCost : result.holdAmount,
          type: customer.type === 'CORPORATE' ? 'PO_INVOICE' : 'PRE_AUTH_HOLD',
          stripePaymentIntentId: holdResultId,
          purchaseOrderNumber: customer.type === 'CORPORATE' ? input.purchaseOrderNumber : null,
          comments: customer.type === 'CORPORATE' 
            ? `Corporate invoice booked under PO ${input.purchaseOrderNumber} for RD$${result.totalEstimatedCost}`
            : `Pre-auth hold of RD$${result.holdAmount} (Rent: RD$${result.totalEstimatedCost} + Deposit: RD$${result.depositAmount})`
        }
      });

      return rental;
    });
  }

  async listOwnReservations(userId: string, statusFilter?: string) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      throw new NotFoundError('Customer profile not found for this user');
    }

    const where: any = { customerId: customer.id };
    if (statusFilter) where.status = statusFilter;

    return await prisma.rental.findMany({
      where,
      include: {
        vehicle: {
          include: {
            brand: true,
            model: true,
            vehicleType: true
          }
        },
        checkoutEmployee: true
      },
      orderBy: { rentalDate: 'desc' }
    });
  }

  async cancelReservation(userId: string, id: string) {
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!rental) {
      throw new NotFoundError('Reservation not found');
    }

    if (rental.status !== 'PENDING') {
      throw new ValidationError(`Reservation cannot be cancelled because it is in ${rental.status} status`);
    }

    // Check permissions: must be the customer themselves or staff
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isOwner = rental.customer.userId === userId;
    const isStaff = user?.role === 'ADMINISTRATOR' || user?.role === 'AGENT';

    if (!isOwner && !isStaff) {
      throw new ValidationError('You do not have permission to cancel this reservation');
    }

    const now = new Date();
    const hoursToStart = (rental.rentalDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return await prisma.$transaction(async (tx) => {
      const isCorporate = rental.customer.type === 'CORPORATE';
      if (hoursToStart < 24.0) {
        // Late cancellation fee: 1 full day rate
        const penalty = rental.pricePerDay;

        if (rental.stripePaymentIntentId && !isCorporate) {
          // Capture the penalty from the pre-auth hold and release the rest
          await stripeService.capturePayment(rental.stripePaymentIntentId, penalty);
        }

        // Log the fee
        await tx.transactionLedger.create({
          data: {
            rentalId: rental.id,
            amount: penalty,
            type: isCorporate ? 'PO_INVOICE' : 'CHARGE',
            stripePaymentIntentId: isCorporate ? null : rental.stripePaymentIntentId,
            purchaseOrderNumber: isCorporate ? rental.purchaseOrderNumber : null,
            comments: isCorporate
              ? `Late cancellation invoice (less than 24h notice) under PO ${rental.purchaseOrderNumber}: 1 day rate of RD$${penalty}`
              : `Late cancellation charge (less than 24h notice): 1 day rate of RD$${penalty}`
          }
        });

        return await tx.rental.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            totalCost: penalty,
            comments: `Late cancellation penalty charged: RD$${penalty}`
          },
          include: {
            vehicle: true
          }
        });
      } else {
        // Free cancellation: release the entire hold
        if (rental.stripePaymentIntentId && !isCorporate) {
          await stripeService.cancelHold(rental.stripePaymentIntentId);
        }

        await tx.transactionLedger.create({
          data: {
            rentalId: rental.id,
            amount: 0.0,
            type: isCorporate ? 'PO_INVOICE' : 'REFUND',
            stripePaymentIntentId: isCorporate ? null : rental.stripePaymentIntentId,
            purchaseOrderNumber: isCorporate ? rental.purchaseOrderNumber : null,
            comments: isCorporate
              ? `Reservation cancelled under PO ${rental.purchaseOrderNumber} with >24h notice. No charge invoice generated.`
              : `Pre-auth hold released: Reservation cancelled with >24h notice`
          }
        });

        return await tx.rental.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            totalCost: 0.0,
            comments: 'Cancelled with free notice'
          },
          include: {
            vehicle: true
          }
        });
      }
    });
  }
}
