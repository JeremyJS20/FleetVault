import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export const useAdminDashboard = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['dashboard-admin'],
    enabled,
    queryFn: async () => {
      const res = await apiClient('/api/dashboard/admin');
      return res.data as {
        totalFleetSize: number;
        activeRentals: number;
        availableVehicles: number;
        utilizationRate: number;
        monthlyRevenue: number;
        revenueGrowth: number;
        newCustomers: number;
        pendingVerification: number;
        revenueChart: { month: string; revenue: number }[];
        recentRentals: {
          id: string;
          car: string;
          customer: string;
          startDate: string;
          endDate: string;
          status: string;
          amount: number;
        }[];
      };
    },
  });
};

export const useCustomerDashboard = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['dashboard-customer'],
    enabled,
    queryFn: async () => {
      const res = await apiClient('/api/dashboard/customer');
      return res.data as {
        activeBookings: number;
        totalBookings: number;
        activeVehicle: string | null;
        totalSpent: number;
        averageRental: number;
        completedCount: number;
        memberSince: string;
        creditLimit: number;
        outstandingBalance: number;
        customerType: string;
        poInvoicesCount: number | null;
        activePOAmount: number | null;
        creditUtilizationPct: number | null;
        nextReturnDate: string | null;
        nextReturnVehicle: string | null;
        licenseStatus: string;
        licenseExpDate: string | null;
        monthlySpending: { month: string; amount: number }[];
        recentRentals: {
          id: string;
          car: string;
          plate: string;
          startDate: string;
          endDate: string;
          status: string;
          amount: number;
          purchaseOrderNumber: string | null;
        }[];
      };
    },
  });
};
