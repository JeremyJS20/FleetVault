import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export interface GpsLiveItem {
  vehicleId: string;
  plateNumber: string;
  brand: string;
  model: string;
  status: string;
  latitude: number;
  longitude: number;
  speedKmH: number;
  heading: number;
  timestamp: string;
}

export interface Geofence {
  id: string;
  name: string;
  coordinatesJson: string;
  alertEmail: string;
  isActive: boolean;
  createdAt: string;
}

export interface GpsLogItem {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmH: number;
  heading: number;
  timestamp: string;
}

export interface UtilizationItem {
  month: string;
  rate: number;
}

export interface RevenueItem {
  month: string;
  [category: string]: any; // dynamic keys for category revenue
}

export interface CommissionItem {
  employeeId: string;
  name: string;
  commissionPercentage: number;
  salesCount: number;
  commissionAmount: number;
  payoutStatus: 'PAID' | 'UNPAID';
}

// 1. GPS Live Map Hook - Polls every 5 seconds
export const useGpsLive = () => {
  return useQuery<GpsLiveItem[]>({
    queryKey: ['gps-live'],
    queryFn: async () => {
      const res = await apiClient('/api/gps/live');
      return res.data;
    },
    refetchInterval: 5000, // poll every 5 seconds
  });
};

// 2. Geofences List Hook
export const useGeofences = () => {
  return useQuery<Geofence[]>({
    queryKey: ['gps-geofences'],
    queryFn: async () => {
      const res = await apiClient('/api/gps/geofences');
      return res.data;
    },
  });
};

// 3. Create Geofence Hook
export const useCreateGeofence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      coordinatesJson: string | [number, number][];
      alertEmail: string;
      isActive?: boolean;
    }) => {
      const res = await apiClient('/api/gps/geofences', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps-geofences'] });
    },
  });
};

// 4. Vehicle Trail Hook
export const useVehicleTrail = (vehicleId: string) => {
  return useQuery<GpsLogItem[]>({
    queryKey: ['gps-trail', vehicleId],
    queryFn: async () => {
      const res = await apiClient(`/api/gps/trail/${vehicleId}`);
      return res.data;
    },
    enabled: !!vehicleId,
  });
};

// 5. Utilization Report Hook
export const useUtilizationReport = () => {
  return useQuery<UtilizationItem[]>({
    queryKey: ['reports-utilization'],
    queryFn: async () => {
      const res = await apiClient('/api/reports/utilization');
      return res.data;
    },
  });
};

// 6. Revenue Report Hook
export const useRevenueReport = () => {
  return useQuery<RevenueItem[]>({
    queryKey: ['reports-revenue'],
    queryFn: async () => {
      const res = await apiClient('/api/reports/revenue');
      return res.data;
    },
  });
};

// 7. Commissions Report Hook
export const useCommissionsReport = () => {
  return useQuery<CommissionItem[]>({
    queryKey: ['reports-commissions'],
    queryFn: async () => {
      const res = await apiClient('/api/reports/commissions');
      return res.data;
    },
  });
};
