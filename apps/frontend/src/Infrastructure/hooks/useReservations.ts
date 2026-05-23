import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export const useOwnReservations = (status?: string) => {
  const params: Record<string, string> = {};
  if (status) params.status = status;

  return useQuery({
    queryKey: ['my-reservations', { status }],
    queryFn: async () => {
      const res = await apiClient('/api/reservations/me', { params });
      return res.data as any[];
    },
  });
};

export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      vehicleId: string;
      rentalDate: string;
      scheduledReturnDate: string;
      stripePaymentMethodId: string;
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
