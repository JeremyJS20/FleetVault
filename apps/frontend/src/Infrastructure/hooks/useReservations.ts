import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export const useOwnReservations = (status?: string, page: number = 1, limit: number = 10) => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  params.page = String(page);
  params.limit = String(limit);

  return useQuery({
    queryKey: ['my-reservations', { status, page, limit }],
    queryFn: async () => {
      const res = await apiClient('/api/reservations/me', { params });
      return res.data as { items: any[]; total: number; page: number; limit: number; pages: number };
    },
    placeholderData: keepPreviousData,
  });
};

export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      vehicleId: string;
      rentalDate: string;
      scheduledReturnDate: string;
      stripePaymentMethodId?: string | null;
      purchaseOrderNumber?: string | null;
    }) => {
      const res = await apiClient('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['public-vehicles'] });
    },
  });
};

export const useCancelReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient(`/api/reservations/${id}/cancel`, {
        method: 'POST',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['public-vehicles'] });
    },
  });
};
