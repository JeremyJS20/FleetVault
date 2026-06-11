import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export const useRentalsList = (params: { status?: string; customerId?: string; page?: number; limit?: number }) => {
  const requestParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      requestParams[key] = String(val);
    }
  });

  return useQuery({
    queryKey: ['rentals', params],
    queryFn: async () => {
      const res = await apiClient('/api/rentals', { params: requestParams });
      return res.data as { items: any[]; total: number; page: number; limit: number; pages: number };
    },
    placeholderData: keepPreviousData,
  });
};

export const useRentalDetail = (id: string) => {
  return useQuery({
    queryKey: ['rental-detail', id],
    queryFn: async () => {
      const res = await apiClient(`/api/rentals/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateRental = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      rentalId?: string;
      customerId?: string;
      checkoutEmployeeId?: string;
      vehicleId?: string;
      rentalDate?: string;
      scheduledReturnDate?: string;
      pricePerDay?: number;
      checkoutOdometer?: number;
      checkoutFuelLevel?: string;
      signatureUrl?: string;
      comments?: string | null;
      stripePaymentMethodId?: string | null;
      paymentMethod?: 'STRIPE' | 'CASH' | null;
      purchaseOrderNumber?: string | null;
      driverName?: string;
      driverLicenseNumber?: string;
      driverLicenseCountry?: string;
      driverLicenseExpDate?: string;
      driverLicensePhotoUrl?: string;
      damages?: { damageTypeId: string; tirePosition?: string | null }[];
      photoUrls?: string[];
      inspectionComments?: string | null;
    }) => {
      const res = await apiClient('/api/rentals', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });
};

export const useRentalReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: {
        actualReturnDate: string;
        returnSignatureUrl: string;
        comments?: string | null;
      };
    }) => {
      const res = await apiClient(`/api/rentals/${id}/return`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['rental-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

export const useRentalReturnEstimate = () => {
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: {
        actualReturnDate: string;
      };
    }) => {
      const res = await apiClient(`/api/rentals/${id}/return-estimate`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data as {
        baseCost: number;
        lateHours: number;
        lateFee: number;
        fuelDifference: number;
        fuelFee: number;
        totalDamageFee: number;
        totalFinalCost: number;
      };
    },
  });
};
