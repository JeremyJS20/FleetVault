import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/Infrastructure/auth.context.js';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, user, isLoading } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const localTheme = localStorage.getItem('theme');
    if (localTheme === 'light' || localTheme === 'dark') return localTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-fg-secondary">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const isStaff = user?.role === 'ADMINISTRATOR' || user?.role === 'AGENT' || user?.role === 'INSPECTOR';
    if (isStaff) {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/customer/dashboard" replace />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-bg-base text-fg-main overflow-hidden px-4 md:px-8 py-6 relative">
      {/* Auroral background glows */}
      <div className="absolute top-[-10%] left-[20%] w-[60%] h-[30%] rounded-full bg-accent-primary opacity-10 filter blur-[120px] pointer-events-none transition-all duration-700"></div>
      <div className="absolute bottom-[-10%] right-[20%] w-[60%] h-[30%] rounded-full bg-accent-primary-end opacity-10 filter blur-[120px] pointer-events-none transition-all duration-700"></div>

      {/* Header */}
      <header className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between py-4 border-b border-border-surface/40 mb-12">
        <div className="flex items-center gap-3 select-none">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-primary-end text-white font-extrabold text-xl shadow-md">
            FV
          </div>
          <span className="text-xl font-bold tracking-tight text-fg-main">
            FleetVault <span className="text-accent-primary">Enterprise</span>
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="btn-ghost"
          aria-label={t('common.toggleTheme')}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      {/* Center Form Card Container */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto flex flex-col items-center">
        <div className="glass-card w-full relative overflow-hidden">
          {theme === 'dark' && (
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto text-center py-6 border-t border-border-surface/40 mt-12 text-xs font-mono tracking-widest text-fg-tertiary uppercase">
        FleetVault Enterprise · Neo-Minimalist Liquid Glass System
      </footer>
    </div>
  );
};

export default AuthLayout;
