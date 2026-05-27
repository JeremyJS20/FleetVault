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
      prisma.transactionLedger.aggregate({
        where: { type: 'CHARGE', createdAt: { gte: firstOfMonth } },
        _sum: { amount: true },
      }),
      prisma.transactionLedger.aggregate({
        where: { type: 'CHARGE', createdAt: { gte: firstOfLastMonth, lt: firstOfMonth } },
        _sum: { amount: true },
      }),
      prisma.customer.count({ where: { createdAt: { gte: firstOfMonth } } }),
    ]);

    const monthlyRevenue = monthlyRevenueResult._sum.amount || 0;
    const lastMonthRevenue = lastMonthRevenueResult._sum.amount || 0;
    const revenueGrowth = lastMonthRevenue > 0
      ? parseFloat((((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1))
      : 0;

    const monthlyRevenues: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const result = await prisma.transactionLedger.aggregate({
        where: { type: 'CHARGE', createdAt: { gte: d, lt: dEnd } },
        _sum: { amount: true },
      });
      monthlyRevenues.push({
        month: d.toLocaleString('en', { month: 'short' }),
        revenue: result._sum.amount || 0,
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

    const totalSpentResult = await prisma.transactionLedger.aggregate({
      where: { rental: { customerId: customer.id }, type: 'CHARGE' },
      _sum: { amount: true },
    });
    const totalSpent = totalSpentResult._sum.amount || 0;
    const rentalCount = recentRentals.length;
    const averageRental = rentalCount > 0 ? totalSpent / rentalCount : 0;

    const firstRental = recentRentals.length > 0
      ? recentRentals[recentRentals.length - 1]
      : null;
    const memberSince = customer.createdAt.toISOString().split('T')[0];

    const outstandingSum = await prisma.rental.aggregate({
      where: { customerId: customer.id, status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] } },
      _sum: { totalCost: true },
    });
    const outstandingBalance = outstandingSum._sum.totalCost || 0;

    return {
      activeBookings,
      totalBookings,
      activeVehicle: activeRental
        ? `${activeRental.vehicle.brand.name} ${activeRental.vehicle.model.name}`
        : null,
      totalSpent,
      averageRental,
      memberSince,
      creditLimit: customer.creditLimit,
      outstandingBalance,
      customerType: customer.type,
      recentRentals: recentRentals.map(r => ({
        id: r.id.slice(0, 8),
        car: `${r.vehicle.brand.name} ${r.vehicle.model.name}`,
        startDate: r.rentalDate.toISOString().split('T')[0],
        endDate: r.scheduledReturnDate.toISOString().split('T')[0],
        status: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
        amount: r.totalCost || 0,
      })),
    };
  }
}
