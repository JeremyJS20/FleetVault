import { useMutation } from '@tanstack/react-query';
import { apiClient, setAccessToken, getAccessToken } from '../api-client.js';

const BLOB_HOSTS = ['.public.blob.vercel-storage.com', '.private.blob.vercel-storage.com'];

export const getImageProxyUrl = (url: string): string => {
  if (!url) return url;
  const isBlobUrl = BLOB_HOSTS.some((host) => url.includes(host));
  if (!isBlobUrl) return url;
  return `/api/uploads/proxy?url=${encodeURIComponent(url)}`;
};

const uploadFetch = async (formData: FormData) => {
  const token = getAccessToken();
  const response = await fetch('/api/uploads', {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });

  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('auth:logout'));
      throw new Error('Session expired');
    }

    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      setAccessToken(null);
      window.dispatchEvent(new CustomEvent('auth:logout'));
      throw new Error('Session expired');
    }

    const resData = await refreshRes.json();
    const newToken = resData.data.accessToken;
    const newRefreshToken = resData.data.refreshToken;
    setAccessToken(newToken);
    if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken);

    const retryResponse = await fetch('/api/uploads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${newToken}` },
      body: formData,
    });

    if (!retryResponse.ok) {
      const errorData = await retryResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const retryRes = await retryResponse.json();
    return retryRes.data as { url: string; pathname: string };
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload image');
  }

  const res = await response.json();
  return res.data as { url: string; pathname: string };
};

export const useUploadImage = () => {
  return useMutation({
    mutationFn: async ({ file, folder, entityType, entityId }: { file: File; folder?: string; entityType?: string; entityId?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) formData.append('folder', folder);
      if (entityType) formData.append('entityType', entityType);
      if (entityId) formData.append('entityId', entityId);

      return uploadFetch(formData);
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
