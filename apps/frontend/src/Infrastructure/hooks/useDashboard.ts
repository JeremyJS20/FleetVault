import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export const useAdminDashboard = () => {
  return useQuery({
    queryKey: ['dashboard-admin'],
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

export const useCustomerDashboard = () => {
  return useQuery({
    queryKey: ['dashboard-customer'],
    queryFn: async () => {
      const res = await apiClient('/api/dashboard/customer');
      return res.data as {
        activeBookings: number;
        totalBookings: number;
        activeVehicle: string | null;
        totalSpent: number;
        averageRental: number;
        memberSince: string;
        recentRentals: {
          id: string;
          car: string;
          startDate: string;
          endDate: string;
          status: string;
          amount: number;
        }[];
      };
    },
  });
};
