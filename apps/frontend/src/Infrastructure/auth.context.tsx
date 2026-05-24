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
  login: (emailOrToken: string, passwordOrUser?: any, refreshToken?: string) => Promise<User | null>;
  register: (name: string, email: string, password: string) => Promise<void>;
  registerCustomer: (data: any) => Promise<void>;
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

  const login = async (emailOrToken: string, passwordOrUser?: any, refreshToken?: string): Promise<User | null> => {
    if (passwordOrUser && typeof passwordOrUser === 'object') {
      const tokenValue = emailOrToken;
      const userValue = passwordOrUser;
      setAccessToken(tokenValue);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
      const normUser = normalizeUser(userValue);
      setUser(normUser);
      return normUser;
    }

    const res = await apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailOrToken, password: passwordOrUser }),
    });

    setAccessToken(res.data.accessToken);
    if (res.data.refreshToken) {
      localStorage.setItem('refresh_token', res.data.refreshToken);
    }
    const normUser = normalizeUser(res.data.user);
    setUser(normUser);
    return normUser;
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
        throw err;
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

  const registerCustomer = async (data: any) => {
    setIsLoading(true);
    try {
      let tokenValue: string | null = null;
      let refreshTokenValue: string | null = null;
      let userValue: any = null;

      try {
        // 1. Call Backend Registration for Customer
        const regRes = await apiClient('/api/auth/register/customer', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        // 2. Automatically log in to get tokens
        try {
          const loginRes = await apiClient('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: data.email, password: data.password }),
          });
          tokenValue = loginRes.data.accessToken;
          refreshTokenValue = loginRes.data.refreshToken;
          userValue = loginRes.data.user;
        } catch (loginErr) {
          userValue = regRes.data.user;
        }
      } catch (err: any) {
        throw err;
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
        registerCustomer,
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
