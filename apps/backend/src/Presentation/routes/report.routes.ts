import { Router } from 'express';
import { prisma } from '../../Infrastructure/db.js';
import { authMiddleware, AuthenticatedRequest } from '../../Application/middleware/auth.middleware.js';
import { requireRole } from '../../Application/middleware/require-role.middleware.js';
import { PdfService } from '../../Application/services/pdf.service.js';

const router = Router();
const pdfService = new PdfService();

// GET /api/reports/utilization - Utilization Report Data
router.get('/utilization', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), async (req, res, next) => {
  try {
    const totalVehicles = await prisma.vehicle.count();
    
    // Calculate utilization for the past 6 months
    const data = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      // Count rentals that were active at any point during this month
      const activeRentalsCount = await prisma.rental.count({
        where: {
          rentalDate: { lt: dEnd },
          OR: [
            { actualReturnDate: null },
            { actualReturnDate: { gte: d } }
          ]
        }
      });

      // Calculate real utilization rate
      const rate = totalVehicles > 0 
        ? Math.min(100, Math.round((activeRentalsCount / totalVehicles) * 100))
        : 0;

      data.push({
        month: d.toLocaleString('en', { month: 'short' }),
        rate: rate,
      });
    }

    if (req.query.format === 'pdf') {
      const pdfUrl = await pdfService.generateUtilizationReportPdf(data);
      return res.status(200).json({ success: true, data: { pdfUrl } });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/revenue - Revenue Report Data by Vehicle Category
router.get('/revenue', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), async (req, res, next) => {
  try {
    const categories = await prisma.vehicleType.findMany();
    const now = new Date();
    const data = [];

    // Past 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = d.toLocaleString('en', { month: 'short' });

      const entry: Record<string, any> = { month: monthLabel };

      for (const cat of categories) {
        const result = await prisma.transactionLedger.aggregate({
          where: {
            createdAt: { gte: d, lt: dEnd },
            rental: {
              vehicle: {
                vehicleTypeId: cat.id
              }
            }
          },
          _sum: { amount: true }
        });

        const amount = result._sum.amount || 0;
        entry[cat.name] = amount;
      }

      data.push(entry);
    }

    if (req.query.format === 'pdf') {
      const categoryNames = categories.map(c => c.name);
      const pdfUrl = await pdfService.generateRevenueReportPdf(data, categoryNames);
      return res.status(200).json({ success: true, data: { pdfUrl } });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/commissions - Commissions Report Data
router.get('/commissions', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), async (req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      where: {
        commissionPercentage: { gt: 0 }
      }
    });

    const data = [];

    for (const emp of employees) {
      // Find completed rentals checked out by this employee
      const rentals = await prisma.rental.findMany({
        where: {
          checkoutEmployeeId: emp.id,
          status: 'COMPLETED'
        }
      });

      const salesCount = rentals.length;
      let commissionAmount = 0;
      
      for (const r of rentals) {
        const rentalCost = r.totalCost || 0;
        commissionAmount += (rentalCost * emp.commissionPercentage) / 100;
      }

      data.push({
        employeeId: emp.id,
        name: emp.name,
        commissionPercentage: emp.commissionPercentage,
        salesCount: salesCount,
        commissionAmount: parseFloat(commissionAmount.toFixed(2)),
        payoutStatus: 'UNPAID', // default to UNPAID since settlement is simulated locally in frontend
      });
    }

    if (req.query.format === 'pdf') {
      if (data.length === 0) {
        return res.status(400).json({ success: false, error: 'No commission data available for the selected period' });
      }
      const pdfUrl = await pdfService.generateCommissionsReportPdf(data);
      return res.status(200).json({ success: true, data: { pdfUrl } });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/rentals - Rental Report with filters
router.get('/rentals', authMiddleware, requireRole(['AGENT', 'ADMINISTRATOR']), async (req, res, next) => {
  try {
    const { startDate, endDate, status, vehicleTypeId, search, page: pageStr, limit: limitStr } = req.query as Record<string, string | undefined>;

    const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '50', 10) || 50));

    const where: any = {};

    if (status) where.status = status;
    if (vehicleTypeId) where.vehicle = { vehicleTypeId };

    if (startDate || endDate) {
      where.rentalDate = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) where.rentalDate.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) where.rentalDate.lte = end;
      }
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { driverName: { contains: q } },
        { purchaseOrderNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { vehicle: { plateNumber: { contains: q } } },
        { checkoutEmployee: { name: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.rental.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          vehicle: { include: { brand: true, model: true, vehicleType: true } },
          customer: true,
          checkoutEmployee: true,
        },
        orderBy: { rentalDate: 'desc' },
      }),
      prisma.rental.count({ where }),
    ]);

    if (req.query.format === 'pdf') {
      if (items.length === 0) {
        return res.status(400).json({ success: false, error: 'No rentals match the applied filters' });
      }
      let vehicleTypeName: string | undefined;
      if (vehicleTypeId) {
        const vt = await prisma.vehicleType.findUnique({ where: { id: vehicleTypeId } });
        vehicleTypeName = vt?.name;
      }
      const pdfUrl = await pdfService.generateRentalReportPdf(items, { startDate, endDate, status, vehicleTypeName, search });
      return res.status(200).json({ success: true, data: { pdfUrl } });
    }

    res.status(200).json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
