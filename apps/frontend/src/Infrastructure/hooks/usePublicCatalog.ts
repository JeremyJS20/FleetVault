import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export const usePublicVehicles = (params: {
  typeId?: string;
  brandId?: string;
  fuelTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
  seats?: number;
}) => {
  const requestParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      requestParams[key] = String(val);
    }
  });

  return useQuery({
    queryKey: ['public-vehicles', params],
    queryFn: async () => {
      const res = await apiClient('/api/catalog/vehicles', { params: requestParams });
      return res.data as any[];
    },
  });
};

export const usePublicVehicleDetail = (id: string, dateFrom?: string, dateTo?: string) => {
  const params: Record<string, string> = {};
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  return useQuery({
    queryKey: ['public-vehicle-detail', id, dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient(`/api/catalog/vehicles/${id}`, { params });
      return res.data;
    },
    enabled: !!id,
  });
};

export const usePublicVehicleTypes = () => {
  return useQuery({
    queryKey: ['public-vehicle-types'],
    queryFn: async () => {
      const res = await apiClient('/api/catalog/vehicle-types');
      return res.data as any[];
    },
  });
};

export const usePublicBrands = () => {
  return useQuery({
    queryKey: ['public-brands'],
    queryFn: async () => {
      const res = await apiClient('/api/catalog/brands');
      return res.data as any[];
    },
  });
};
