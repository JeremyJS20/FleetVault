let accessToken: string | null = localStorage.getItem('access_token');

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

export const getAccessToken = () => accessToken;

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const apiClient = async (path: string, options: RequestOptions = {}): Promise<any> => {
  const { params, headers, ...rest } = options;
  
  let url = path;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const token = getAccessToken();
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const response = await fetch(url, {
      headers: { ...authHeaders, ...headers },
      ...rest,
    });

    if (response.status === 401) {
      if (url.includes('/api/auth/refresh')) {
        setAccessToken(null);
        throw new Error('Unauthorized');
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = localStorage.getItem('refresh_token');
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const resData = await refreshRes.json();
            const newToken = resData.data.accessToken;
            const newRefreshToken = resData.data.refreshToken;
            setAccessToken(newToken);
            if (newRefreshToken) {
              localStorage.setItem('refresh_token', newRefreshToken);
            }
            onRefreshed(newToken);
            isRefreshing = false;
          } else {
            isRefreshing = false;
            setAccessToken(null);
            window.dispatchEvent(new CustomEvent('auth:logout'));
            throw new Error('Session expired');
          }
        } catch (err) {
          isRefreshing = false;
          setAccessToken(null);
          window.dispatchEvent(new CustomEvent('auth:logout'));
          throw err;
        }
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          const retriedHeaders = {
            ...authHeaders,
            ...headers,
            Authorization: `Bearer ${newToken}`,
          };
          fetch(url, {
            headers: retriedHeaders,
            ...rest,
          })
            .then((res) => {
              if (!res.ok) {
                return res.json().then((err) => reject(err));
              }
              return res.json();
            })
            .then((data) => resolve(data))
            .catch((err) => reject(err));
        });
      });
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const error = new Error(errData.message || errData.error || `Request failed with status ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }
    return response.json();
  } catch (err) {
    throw err;
  }
};
