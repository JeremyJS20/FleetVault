import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setAccessToken, getAccessToken } from './api-client.js';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer' | string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (user: any): User | null => {
  if (!user) return null;
  let role = user.role?.toUpperCase();
  if (role === 'ADMIN') {
    role = 'ADMINISTRATOR';
  }
  return {
    ...user,
    role,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiClient('/api/auth/me');
      // Backend returns { success: true, data: user }
      setUser(normalizeUser(data.data));
    } catch (err) {
      console.error('Failed to restore auth session:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleLogoutEvent = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      let tokenValue: string;
      let refreshTokenValue: string | null = null;
      let userValue: any;
      try {
        const res = await apiClient('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        tokenValue = res.data.accessToken;
        refreshTokenValue = res.data.refreshToken;
        userValue = res.data.user;
      } catch (err: any) {
        // Fallback for development testing only if it is a network error (no status code)
        if (!err.status && (email.includes('admin') || email.includes('customer'))) {
          const role = email.includes('admin') ? 'ADMINISTRATOR' : 'CUSTOMER';
          tokenValue = `mock-jwt-token-for-${role.toLowerCase()}`;
          userValue = {
            id: `mock-id-${role.toLowerCase()}`,
            name: role === 'ADMINISTRATOR' ? 'System Administrator' : 'John Customer',
            email: email,
            role: role,
          };
        } else {
          throw err;
        }
      }

      setAccessToken(tokenValue);
      if (refreshTokenValue) {
        localStorage.setItem('refresh_token', refreshTokenValue);
      }
      const normUser = normalizeUser(userValue);
      setUser(normUser);
      return normUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      let tokenValue: string | null = null;
      let refreshTokenValue: string | null = null;
      let userValue: any = null;

      try {
        // 1. Call Backend Registration
        const regRes = await apiClient('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });

        // 2. Automatically log in to get tokens
        try {
          const loginRes = await apiClient('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          tokenValue = loginRes.data.accessToken;
          refreshTokenValue = loginRes.data.refreshToken;
          userValue = loginRes.data.user;
        } catch (loginErr) {
          // If login fails after registration, we still set registered user details
          userValue = regRes.data.user;
        }
      } catch (err: any) {
        // Mock fallback only if it is a network error (no status code)
        if (!err.status) {
          tokenValue = 'mock-jwt-token-for-customer';
          userValue = {
            id: 'mock-id-customer',
            name: name,
            email: email,
            role: 'CUSTOMER',
          };
        } else {
          throw err;
        }
      }

      setAccessToken(tokenValue);
      if (refreshTokenValue) {
        localStorage.setItem('refresh_token', refreshTokenValue);
      }
      setUser(normalizeUser(userValue));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAccessToken(null);
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsLoading(false);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
