import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api-client.js';

export const useUploadImage = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      // 1. We upload via FormData
      const formData = new FormData();
      formData.append('file', file);

      // Note: apiClient standard setup expects JSON if body is present, so let's use standard fetch here to prevent headers conflict
      const jwtSecret = localStorage.getItem('fleetvault_token');
      const response = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          ...(jwtSecret ? { Authorization: `Bearer ${jwtSecret}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const res = await response.json();
      return res.data as { url: string; pathname: string };
    },
  });
};

export const useDeleteImage = () => {
  return useMutation({
    mutationFn: async (url: string) => {
      const res = await apiClient(`/api/uploads?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });
      return res.data;
    },
  });
};
