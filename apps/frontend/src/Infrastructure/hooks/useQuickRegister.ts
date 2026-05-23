import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export interface QuickRegisterInput {
  email: string;
  firstName: string;
  lastName: string;
}

export interface QuickRegisterSuccess {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    status: string;
    type: string;
  };
}

export interface QuickRegisterExists {
  exists: true;
  email: string;
  magicLinkSent: true;
}

export type QuickRegisterResponse = QuickRegisterSuccess | QuickRegisterExists;

export const useQuickRegister = () => {
  return useMutation({
    mutationFn: async (data: QuickRegisterInput): Promise<QuickRegisterResponse> => {
      try {
        const res = await apiClient('/api/auth/register/quick', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return res.data;
      } catch (err: any) {
        throw err;
      }
    },
  });
};
