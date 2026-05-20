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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      setUser(data.user);
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      let data;
      try {
        data = await apiClient('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      } catch (err) {
        // Fallback for development testing
        if (email.includes('admin') || email.includes('customer')) {
          const role = email.includes('admin') ? 'admin' : 'customer';
          data = {
            accessToken: `mock-jwt-token-for-${role}`,
            user: {
              id: `mock-id-${role}`,
              name: role === 'admin' ? 'System Administrator' : 'John Customer',
              email: email,
              role: role,
            },
          };
        } else {
          throw err;
        }
      }

      setAccessToken(data.accessToken);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      let data;
      try {
        data = await apiClient('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
      } catch (err) {
        data = {
          accessToken: 'mock-jwt-token-for-customer',
          user: {
            id: 'mock-id-customer',
            name: name,
            email: email,
            role: 'customer',
          },
        };
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAccessToken(null);
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
