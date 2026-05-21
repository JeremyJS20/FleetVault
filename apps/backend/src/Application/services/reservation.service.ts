import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError, ValidationError, ConflictError } from '../../Domain/errors/index.js';
import { StripeService } from './stripe.service.js';

const stripeService = new StripeService();

export class ReservationService {
  async createReservation(userId: string, input: {
    vehicleId: string;
    rentalDate: string;
    scheduledReturnDate: string;
    stripePaymentMethodId: string;
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

    // License expiration check
    if (customer.licenseExpDate && new Date(customer.licenseExpDate) < now) {
      throw new ValidationError('Your driver\'s license is expired. Please update your profile.');
    }

    // 2. Compute duration in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays || 1;

    // 3. Find default system agent employee to link (schema requires employeeId)
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
      const baseRates: Record<string, number> = {
        sedan: 45.0,
        suv: 75.0,
        truck: 85.0
      };
      const typeName = vehicle.vehicleType.name.toLowerCase();
      const baseDailyRate = baseRates[typeName] || 50.0;

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
      
      // Hold amount = Total rental estimate + $200 security deposit
      const holdAmount = totalEstimatedCost + 200.0;

      return {
        vehicle,
        pricePerDay,
        totalEstimatedCost,
        holdAmount,
        multiplier,
        seasonalName: activeRate ? activeRate.name : null
      };
    });

    // 5. Create pre-auth hold on card via Stripe
    const metadata = {
      customerId: customer.id,
      customerName: customer.name,
      vehiclePlate: result.vehicle.plateNumber,
      dateRange: `${input.rentalDate} to ${input.scheduledReturnDate}`
    };

    const holdResult = await stripeService.createPreAuthHold(result.holdAmount, undefined, metadata);

    // 6. Save pending rental and ledger inside a second transaction
    return await prisma.$transaction(async (tx) => {
      const rental = await tx.rental.create({
        data: {
          customerId: customer.id,
          employeeId: defaultEmployee.id,
          vehicleId: input.vehicleId,
          rentalDate: start,
          scheduledReturnDate: end,
          pricePerDay: result.pricePerDay,
          checkoutOdometer: result.vehicle.odometer,
          checkoutFuelLevel: 'FULL',
          status: 'PENDING',
          stripePaymentIntentId: holdResult.id,
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
          amount: result.holdAmount,
          type: 'PRE_AUTH_HOLD',
          stripePaymentIntentId: holdResult.id,
          comments: `Pre-auth hold of $${result.holdAmount} (Rent: $${result.totalEstimatedCost} + Deposit: $200)`
        }
      });

      return rental;
    });
  }

  async listOwnReservations(userId: string) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      throw new NotFoundError('Customer profile not found for this user');
    }

    return await prisma.rental.findMany({
      where: { customerId: customer.id },
      include: {
        vehicle: {
          include: {
            brand: true,
            model: true,
            vehicleType: true
          }
        }
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
      if (hoursToStart < 24.0) {
        // Late cancellation fee: 1 full day rate
        const penalty = rental.pricePerDay;

        if (rental.stripePaymentIntentId) {
          // Capture the penalty from the pre-auth hold and release the rest
          await stripeService.capturePayment(rental.stripePaymentIntentId, penalty);
        }

        // Log the fee
        await tx.transactionLedger.create({
          data: {
            rentalId: rental.id,
            amount: penalty,
            type: 'CHARGE',
            stripePaymentIntentId: rental.stripePaymentIntentId,
            comments: `Late cancellation charge (less than 24h notice): 1 day rate of $${penalty}`
          }
        });

        return await tx.rental.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            totalCost: penalty,
            comments: `Late cancellation penalty charged: $${penalty}`
          },
          include: {
            vehicle: true
          }
        });
      } else {
        // Free cancellation: release the entire hold
        if (rental.stripePaymentIntentId) {
          await stripeService.cancelHold(rental.stripePaymentIntentId);
        }

        await tx.transactionLedger.create({
          data: {
            rentalId: rental.id,
            amount: 0.0,
            type: 'REFUND',
            stripePaymentIntentId: rental.stripePaymentIntentId,
            comments: `Pre-auth hold released: Reservation cancelled with >24h notice`
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
