import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export const useInspectionsList = (params: { vehicleId?: string; customerId?: string; page?: number; limit?: number }) => {
  const requestParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      requestParams[key] = String(val);
    }
  });

  return useQuery({
    queryKey: ['inspections', params],
    queryFn: async () => {
      const res = await apiClient('/api/inspections', { params: requestParams });
      return res.data as { items: any[]; total: number; page: number; limit: number; pages: number };
    },
  });
};

export const useInspectionDetail = (id: string) => {
  return useQuery({
    queryKey: ['inspection-detail', id],
    queryFn: async () => {
      const res = await apiClient(`/api/inspections/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      rentalId?: string | null;
      vehicleId: string;
      customerId: string;
      employeeId?: string;
      hasScratches: boolean;
      fuelGaugeLevel: string;
      fuelGaugePhotoUrl: string;
      hasSpareTire: boolean;
      hasJack: boolean;
      hasBrokenGlass: boolean;
      tireConditionFrontLeft: string;
      tireConditionFrontRight: string;
      tireConditionRearLeft: string;
      tireConditionRearRight: string;
      odometer: number;
      photoUrls: string[];
      comments?: string | null;
    }) => {
      const res = await apiClient('/api/inspections', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
  });
};
