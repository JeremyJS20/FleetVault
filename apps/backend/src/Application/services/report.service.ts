import { prisma } from '../../Infrastructure/db.js';
import { ValidationError } from '../../Domain/errors/ValidationError.js';

export class ReportService {
  /**
   * Helper to ensure dates are valid Date objects.
   */
  private parseDates(startDate: any, endDate: any): { start: Date; end: Date } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Invalid start or end date format');
    }

    if (start > end) {
      throw new ValidationError('Start date must be before or equal to end date');
    }

    return { start, end };
  }

  async getUtilizationReport(startDateInput: any, endDateInput: any) {
    const { start, end } = this.parseDates(startDateInput, endDateInput);
    
    // Total days in the period
    const totalMs = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(totalMs / (1000 * 60 * 60 * 24)));

    // Fetch all vehicles
    const vehicles = await prisma.vehicle.findMany({
      include: {
        brand: true,
        model: true,
        vehicleType: true,
      },
    });

    // Fetch all rentals overlapping with the period that are not cancelled
    const rentals = await prisma.rental.findMany({
      where: {
        status: { in: ['ACTIVE', 'COMPLETED'] },
        rentalDate: { lte: end },
      },
    });

    // We filter rentals in memory to compute overlaps.
    // A rental overlaps if its return date (or scheduled if active and not returned yet) is >= start.
    const vehicleRentedDaysMap: Record<string, number> = {};

    for (const vehicle of vehicles) {
      vehicleRentedDaysMap[vehicle.id] = 0;
    }

    for (const rental of rentals) {
      const rentalStart = rental.rentalDate;
      const rentalEnd = rental.actualReturnDate ?? rental.scheduledReturnDate;

      if (rentalEnd < start) {
        continue;
      }

      // Determine overlap range
      const overlapStart = new Date(Math.max(start.getTime(), rentalStart.getTime()));
      const overlapEnd = new Date(Math.min(end.getTime(), rentalEnd.getTime()));

      const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
      if (overlapMs > 0) {
        const overlapDays = overlapMs / (1000 * 60 * 60 * 24);
        if (!vehicleRentedDaysMap[rental.vehicleId]) {
          vehicleRentedDaysMap[rental.vehicleId] = 0;
        }
        vehicleRentedDaysMap[rental.vehicleId] += overlapDays;
      }
    }

    // Compile vehicle utilization details
    const vehicleDetails = vehicles.map((v) => {
      const rentedDays = Math.min(totalDays, parseFloat((vehicleRentedDaysMap[v.id] || 0).toFixed(2)));
      const utilizationRate = parseFloat(((rentedDays / totalDays) * 100).toFixed(2));
      return {
        id: v.id,
        plateNumber: v.plateNumber,
        brand: v.brand.name,
        model: v.model.name,
        type: v.vehicleType.name,
        vehicleTypeId: v.vehicleTypeId,
        rentedDays,
        utilizationRate,
      };
    });

    // Aggregate by vehicle type
    const byVehicleTypeMap: Record<string, { name: string; rentedDays: number; totalCount: number }> = {};
    for (const detail of vehicleDetails) {
      if (!byVehicleTypeMap[detail.vehicleTypeId]) {
        byVehicleTypeMap[detail.vehicleTypeId] = {
          name: detail.type,
          rentedDays: 0,
          totalCount: 0,
        };
      }
      byVehicleTypeMap[detail.vehicleTypeId].rentedDays += detail.rentedDays;
      byVehicleTypeMap[detail.vehicleTypeId].totalCount += 1;
    }

    const byVehicleType = Object.entries(byVehicleTypeMap).map(([id, val]) => {
      const typeTotalDays = val.totalCount * totalDays;
      const utilizationRate = typeTotalDays > 0 
        ? parseFloat(((val.rentedDays / typeTotalDays) * 100).toFixed(2)) 
        : 0;
      return {
        vehicleTypeId: id,
        name: val.name,
        totalVehicles: val.totalCount,
        rentedDays: parseFloat(val.rentedDays.toFixed(2)),
        utilizationRate,
      };
    });

    // Calculate overall utilization
    const totalRentedDays = vehicleDetails.reduce((acc, curr) => acc + curr.rentedDays, 0);
    const overallTotalDays = vehicles.length * totalDays;
    const overallUtilizationRate = overallTotalDays > 0 
      ? parseFloat(((totalRentedDays / overallTotalDays) * 100).toFixed(2)) 
      : 0;

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalDays,
      totalVehicles: vehicles.length,
      overallUtilizationRate,
      vehicles: vehicleDetails,
      byVehicleType,
    };
  }

  async getRevenueReport(startDateInput: any, endDateInput: any) {
    const { start, end } = this.parseDates(startDateInput, endDateInput);

    const ledgers = await prisma.transactionLedger.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Classify revenue by type
    const byType: Record<string, number> = {};
    let totalRevenue = 0;

    // Daily breakdown
    const dailyMap: Record<string, number> = {};

    for (const ledger of ledgers) {
      const type = ledger.type;
      byType[type] = (byType[type] || 0) + ledger.amount;

      // Only count actual revenues (CHARGE, CASH, PO_INVOICE) and deduct REFUNDs
      // PRE_AUTH_HOLD is not actual revenue, it's just a pre-authorization hold.
      if (type === 'CHARGE' || type === 'CASH' || type === 'PO_INVOICE') {
        totalRevenue += ledger.amount;
        
        const dateStr = ledger.createdAt.toISOString().split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + ledger.amount;
      } else if (type === 'REFUND') {
        totalRevenue -= ledger.amount;
        
        const dateStr = ledger.createdAt.toISOString().split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) - ledger.amount;
      }
    }

    const dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({
      date,
      amount: parseFloat(amount.toFixed(2)),
    }));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      byType: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
      ),
      dailyRevenue,
    };
  }

  async getCommissionsReport(startDateInput: any, endDateInput: any) {
    const { start, end } = this.parseDates(startDateInput, endDateInput);

    // Get completed rentals in the period
    const rentals = await prisma.rental.findMany({
      where: {
        status: 'COMPLETED',
        actualReturnDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        checkoutEmployee: true,
      },
    });

    const employeeMap: Record<
      string,
      {
        id: string;
        name: string;
        nationalId: string;
        commissionPercentage: number;
        totalCommission: number;
        totalSales: number;
        rentalsCount: number;
      }
    > = {};

    for (const rental of rentals) {
      const emp = rental.checkoutEmployee;
      if (!emp) continue;

      if (!employeeMap[emp.id]) {
        employeeMap[emp.id] = {
          id: emp.id,
          name: emp.name,
          nationalId: emp.nationalId,
          commissionPercentage: emp.commissionPercentage,
          totalCommission: 0,
          totalSales: 0,
          rentalsCount: 0,
        };
      }

      const commission = rental.commissionAmount || 0;
      const sales = rental.totalCost || 0;

      employeeMap[emp.id].totalCommission += commission;
      employeeMap[emp.id].totalSales += sales;
      employeeMap[emp.id].rentalsCount += 1;
    }

    const employees = Object.values(employeeMap).map((emp) => ({
      ...emp,
      totalCommission: parseFloat(emp.totalCommission.toFixed(2)),
      totalSales: parseFloat(emp.totalSales.toFixed(2)),
    }));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalCommissionsPaid: parseFloat(
        employees.reduce((acc, curr) => acc + curr.totalCommission, 0).toFixed(2)
      ),
      employees,
    };
  }
}
