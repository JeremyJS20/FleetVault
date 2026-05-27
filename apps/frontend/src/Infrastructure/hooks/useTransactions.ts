import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export const useTransactions = (params: {
  type?: string;
  customerId?: string;
  rentalId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const requestParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      requestParams[key] = String(val);
    }
  });

  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const res = await apiClient('/api/transactions', { params: requestParams });
      return res.data as { items: any[]; total: number; page: number; limit: number; pages: number };
    },
  });
};
