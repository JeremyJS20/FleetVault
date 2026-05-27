import { prisma } from '../../Infrastructure/db.js';
import { NotFoundError } from '../../Domain/errors/index.js';

export class DashboardService {
  async getAdminDashboard() {
    const totalVehicles = await prisma.vehicle.count();
    const activeRentals = await prisma.rental.count({ where: { status: 'ACTIVE' } });
    const availableVehicles = await prisma.vehicle.count({ where: { status: 'AVAILABLE' } });
    const utilizationRate = totalVehicles > 0
      ? parseFloat(((activeRentals / totalVehicles) * 100).toFixed(1))
      : 0;

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [monthlyRevenueResult, lastMonthRevenueResult, newCustomers] = await Promise.all([
      prisma.rental.aggregate({
        where: { status: 'COMPLETED', actualReturnDate: { gte: firstOfMonth } },
        _sum: { totalCost: true },
      }),
      prisma.rental.aggregate({
        where: { status: 'COMPLETED', actualReturnDate: { gte: firstOfLastMonth, lt: firstOfMonth } },
        _sum: { totalCost: true },
      }),
      prisma.customer.count({ where: { createdAt: { gte: firstOfMonth } } }),
    ]);

    const monthlyRevenue = monthlyRevenueResult._sum.totalCost || 0;
    const lastMonthRevenue = lastMonthRevenueResult._sum.totalCost || 0;
    const revenueGrowth = lastMonthRevenue > 0
      ? parseFloat((((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1))
      : 0;

    const monthlyRevenues: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const result = await prisma.rental.aggregate({
        where: { status: 'COMPLETED', actualReturnDate: { gte: d, lt: dEnd } },
        _sum: { totalCost: true },
      });
      monthlyRevenues.push({
        month: d.toLocaleString('en', { month: 'short' }),
        revenue: result._sum.totalCost || 0,
      });
    }

    const recentRentals = await prisma.rental.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { include: { model: true, brand: true } },
        customer: true,
      },
    });

    const pendingVerification = await prisma.customer.count({
      where: { status: 'ACTIVE', licensePhotoUrl: null },
    });

    return {
      totalFleetSize: totalVehicles,
      activeRentals,
      availableVehicles,
      utilizationRate,
      monthlyRevenue,
      revenueGrowth,
      newCustomers,
      pendingVerification,
      revenueChart: monthlyRevenues,
      recentRentals: recentRentals.map(r => ({
        id: r.id.slice(0, 8),
        car: `${r.vehicle.brand.name} ${r.vehicle.model.name}`,
        customer: r.customer.name,
        startDate: r.rentalDate.toISOString().split('T')[0],
        endDate: r.scheduledReturnDate.toISOString().split('T')[0],
        status: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
        amount: r.totalCost || 0,
      })),
    };
  }

  async getCustomerDashboard(userId: string) {
    const customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new NotFoundError('Customer profile not found');

    const [activeBookings, totalBookings] = await Promise.all([
      prisma.rental.count({ where: { customerId: customer.id, status: 'ACTIVE' } }),
      prisma.rental.count({ where: { customerId: customer.id } }),
    ]);

    const activeRental = activeBookings > 0
      ? await prisma.rental.findFirst({
          where: { customerId: customer.id, status: 'ACTIVE' },
          include: { vehicle: { include: { model: true, brand: true } } },
          orderBy: { rentalDate: 'desc' },
        })
      : null;

    const recentRentals = await prisma.rental.findMany({
      where: { customerId: customer.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { vehicle: { include: { model: true, brand: true } } },
    });

    const [totalSpentAgg, completedCount, outstandingAgg] = await Promise.all([
      prisma.rental.aggregate({
        where: { customerId: customer.id, status: 'COMPLETED' },
        _sum: { totalCost: true },
      }),
      prisma.rental.count({
        where: { customerId: customer.id, status: 'COMPLETED' },
      }),
      prisma.rental.aggregate({
        where: { customerId: customer.id, status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] } },
        _sum: { totalCost: true },
      }),
    ]);

    const totalSpent = totalSpentAgg._sum.totalCost || 0;
    const outstandingBalance = outstandingAgg._sum.totalCost || 0;
    const rentalCount = recentRentals.length;
    const averageRental = rentalCount > 0 ? totalSpent / rentalCount : 0;

    // Monthly spending chart (last 6 months based on actualReturnDate for completed, rentalDate for others)
    const now = new Date();
    const monthlySpending: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const agg = await prisma.rental.aggregate({
        where: {
          customerId: customer.id,
          status: 'COMPLETED',
          actualReturnDate: { gte: d, lt: dEnd },
        },
        _sum: { totalCost: true },
      });
      monthlySpending.push({
        month: d.toLocaleString('en', { month: 'short' }),
        amount: agg._sum.totalCost || 0,
      });
    }

    // Type-specific stats
    let poInvoicesCount: number | null = null;
    let activePOAmount: number | null = null;
    let creditUtilizationPct: number | null = null;

    let nextReturnDate: string | null = null;
    let nextReturnVehicle: string | null = null;
    let licenseStatus: string = 'missing';
    let licenseExpDate: string | null = null;

    if (customer.type === 'CORPORATE') {
      const poRentals = await prisma.rental.findMany({
        where: { customerId: customer.id, purchaseOrderNumber: { not: null } },
      });
      poInvoicesCount = poRentals.length;
      activePOAmount = poRentals
        .filter(r => r.status === 'ACTIVE')
        .reduce((sum, r) => sum + (r.totalCost || 0), 0);
      creditUtilizationPct = customer.creditLimit > 0
        ? parseFloat(((outstandingBalance / customer.creditLimit) * 100).toFixed(1))
        : 0;
    } else {
      // Individual-specific
      if (activeRental) {
        nextReturnDate = activeRental.scheduledReturnDate.toISOString().split('T')[0];
        nextReturnVehicle = `${activeRental.vehicle.brand.name} ${activeRental.vehicle.model.name}`;
      }
      if (customer.licenseExpDate) {
        const expDate = new Date(customer.licenseExpDate);
        const daysUntilExp = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        licenseStatus = daysUntilExp <= 30 ? 'expiringSoon' : 'valid';
        licenseExpDate = expDate.toISOString().split('T')[0];
      } else if (customer.licenseNumber) {
        licenseStatus = 'valid';
      }
    }

    return {
      activeBookings,
      totalBookings,
      activeVehicle: activeRental
        ? `${activeRental.vehicle.brand.name} ${activeRental.vehicle.model.name}`
        : null,
      totalSpent,
      averageRental,
      completedCount,
      memberSince: customer.createdAt.toISOString().split('T')[0],
      creditLimit: customer.creditLimit,
      outstandingBalance,
      customerType: customer.type,
      poInvoicesCount,
      activePOAmount,
      creditUtilizationPct,
      nextReturnDate,
      nextReturnVehicle,
      licenseStatus,
      licenseExpDate,
      monthlySpending,
      recentRentals: recentRentals.map(r => ({
        id: r.id.slice(0, 8),
        car: `${r.vehicle.brand.name} ${r.vehicle.model.name}`,
        plate: r.vehicle.plateNumber,
        startDate: r.rentalDate.toISOString().split('T')[0],
        endDate: r.scheduledReturnDate.toISOString().split('T')[0],
        status: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
        amount: r.totalCost || 0,
        purchaseOrderNumber: r.purchaseOrderNumber || null,
      })),
    };
  }
}
