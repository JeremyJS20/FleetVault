import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

// Generic List Query Helper
const createListHook = <T>(queryKey: string, endpoint: string) => {
  return (params: { search?: string; status?: string; brandId?: string; modelId?: string; vehicleTypeId?: string; fuelTypeId?: string; cleaningStatus?: string; type?: string; shift?: string; excludeWithActiveRentals?: boolean; page?: number; limit?: number }) => {
    // Convert numbers/booleans to strings for URLSearchParams
    const requestParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        requestParams[key] = String(val);
      }
    });

    return useQuery({
      queryKey: [queryKey, params],
      queryFn: async () => {
        const res = await apiClient(endpoint, { params: requestParams });
        return res.data as { items: T[]; total: number; page: number; limit: number; pages: number };
      },
    });
  };
};

// Generic Create/Update/Delete/Toggle Helper
const createMutationHook = <TPayload, TResponse>(
  method: 'POST' | 'PUT' | 'PATCH',
  endpointBuilder: (id?: string) => string,
  invalidateKeys: string[]
) => {
  return () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, data }: { id?: string; data?: TPayload }) => {
        const res = await apiClient(endpointBuilder(id), {
          method,
          body: data ? JSON.stringify(data) : undefined,
        });
        return res.data as TResponse;
      },
      onSuccess: () => {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      },
    });
  };
};

// 1. Vehicle Types Hooks
export const useVehicleTypes = createListHook<any>('vehicle-types', '/api/vehicle-types');
export const useCreateVehicleType = createMutationHook<any, any>('POST', () => '/api/vehicle-types', ['vehicle-types']);
export const useUpdateVehicleType = createMutationHook<any, any>('PUT', (id) => `/api/vehicle-types/${id}`, ['vehicle-types']);
export const useToggleVehicleTypeStatus = createMutationHook<void, any>('PATCH', (id) => `/api/vehicle-types/${id}/status`, ['vehicle-types']);

// 2. Brands Hooks
export const useBrands = createListHook<any>('brands', '/api/brands');
export const useCreateBrand = createMutationHook<any, any>('POST', () => '/api/brands', ['brands']);
export const useUpdateBrand = createMutationHook<any, any>('PUT', (id) => `/api/brands/${id}`, ['brands']);
export const useToggleBrandStatus = createMutationHook<void, any>('PATCH', (id) => `/api/brands/${id}/status`, ['brands']);

// 3. Models Hooks
export const useModels = createListHook<any>('models', '/api/models');
export const useCreateModel = createMutationHook<any, any>('POST', () => '/api/models', ['models']);
export const useUpdateModel = createMutationHook<any, any>('PUT', (id) => `/api/models/${id}`, ['models']);
export const useToggleModelStatus = createMutationHook<void, any>('PATCH', (id) => `/api/models/${id}/status`, ['models']);

// 4. Fuel Types Hooks
export const useFuelTypes = createListHook<any>('fuel-types', '/api/fuel-types');
export const useCreateFuelType = createMutationHook<any, any>('POST', () => '/api/fuel-types', ['fuel-types']);
export const useUpdateFuelType = createMutationHook<any, any>('PUT', (id) => `/api/fuel-types/${id}`, ['fuel-types']);
export const useToggleFuelTypeStatus = createMutationHook<void, any>('PATCH', (id) => `/api/fuel-types/${id}/status`, ['fuel-types']);

// 5. Vehicles Hooks
export const useVehicles = createListHook<any>('vehicles', '/api/vehicles');
export const useCreateVehicle = createMutationHook<any, any>('POST', () => '/api/vehicles', ['vehicles']);
export const useUpdateVehicle = createMutationHook<any, any>('PUT', (id) => `/api/vehicles/${id}`, ['vehicles']);
export const useToggleVehicleStatus = createMutationHook<void, any>('PATCH', (id) => `/api/vehicles/${id}/status`, ['vehicles']);
export const useUpdateVehicleCleaning = createMutationHook<{ cleaningStatus: 'CLEAN' | 'DIRTY' }, any>(
  'PATCH',
  (id) => `/api/vehicles/${id}/cleaning`,
  ['vehicles']
);

export const usePassInspection = createMutationHook<void, any>(
  'PATCH',
  (id) => `/api/vehicles/${id}/pass-inspection`,
  ['vehicles']
);

// 6. Customers Hooks
export const useCustomers = createListHook<any>('customers', '/api/customers');
export const useCreateCustomer = createMutationHook<any, any>('POST', () => '/api/customers', ['customers']);
export const useUpdateCustomer = createMutationHook<any, any>('PUT', (id) => `/api/customers/${id}`, ['customers']);
export const useToggleCustomerStatus = createMutationHook<void, any>('PATCH', (id) => `/api/customers/${id}/status`, ['customers']);

// 7. Employees Hooks
export const useEmployees = createListHook<any>('employees', '/api/employees');
export const useCreateEmployee = createMutationHook<any, any>('POST', () => '/api/employees', ['employees']);
export const useUpdateEmployee = createMutationHook<any, any>('PUT', (id) => `/api/employees/${id}`, ['employees']);
export const useToggleEmployeeStatus = createMutationHook<void, any>('PATCH', (id) => `/api/employees/${id}/status`, ['employees']);

// 8. Seasonal Rates Hooks
export const useSeasonalRates = createListHook<any>('seasonal-rates', '/api/seasonal-rates');
export const useCreateSeasonalRate = createMutationHook<any, any>('POST', () => '/api/seasonal-rates', ['seasonal-rates']);
export const useUpdateSeasonalRate = createMutationHook<any, any>('PUT', (id) => `/api/seasonal-rates/${id}`, ['seasonal-rates']);
export const useToggleSeasonalRateStatus = createMutationHook<void, any>('PATCH', (id) => `/api/seasonal-rates/${id}/status`, ['seasonal-rates']);

// 9. Fee Config Hooks
export const useFeeConfigs = () => {
  return useQuery({
    queryKey: ['fee-config'],
    queryFn: async () => {
      const res = await apiClient('/api/fee-config');
      return res.data as any[];
    },
  });
};

export const useUpdateFeeConfig = createMutationHook<any, any>('PUT', (id) => `/api/fee-config/${id}`, ['fee-config']);

// 10. Payment Method Hooks
export const useMyPaymentMethods = () => {
  return useQuery({
    queryKey: ['my-payment-methods'],
    queryFn: async () => {
      const res = await apiClient('/api/customers/me/payment-methods');
      return res.data as any[];
    },
  });
};

export const useCustomerPaymentMethods = (customerId?: string) => {
  return useQuery({
    queryKey: ['customer-payment-methods', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const res = await apiClient(`/api/customers/${customerId}/payment-methods`);
      return res.data as any[];
    },
    enabled: !!customerId,
  });
};

export const useDeleteMyPaymentMethod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const res = await apiClient(`/api/customers/me/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-payment-methods'] });
    },
  });
};

export const useDeleteCustomerPaymentMethod = (customerId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      if (!customerId) throw new Error('Customer ID is required');
      const res = await apiClient(`/api/customers/${customerId}/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payment-methods', customerId] });
    },
  });
};

export const useUpdateRental = createMutationHook<any, any>('PUT', (id) => `/api/rentals/${id}`, ['rentals']);
export const useUpdateInspection = createMutationHook<any, any>('PUT', (id) => `/api/inspections/${id}`, ['inspections']);

export const useMyCustomerProfile = (enabled = true) => {
  return useQuery({
    queryKey: ['my-customer-profile'],
    queryFn: async () => {
      const res = await apiClient('/api/customers/me');
      return res.data;
    },
    enabled,
  });
};
