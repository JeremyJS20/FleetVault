import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/Infrastructure/auth.context.js';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar.js';
import { Sun, Moon, Bell } from 'lucide-react';

export const CustomerLayout: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
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
          <span className="text-xs font-mono text-fg-secondary">{t('common.verifyingCredentials')}</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isStaff = user?.role === 'ADMINISTRATOR' || user?.role === 'AGENT' || user?.role === 'INSPECTOR';
  if (isStaff) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex bg-bg-base text-fg-main overflow-hidden relative">
      {/* Auroral background glows */}
      <div className="absolute top-[-10%] left-[20%] w-[50%] h-[30%] rounded-full bg-accent-primary opacity-5 filter blur-[120px] pointer-events-none"></div>
      
      {/* Sidebar */}
      <Sidebar role="customer" />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-16 px-8 border-b border-border-surface/40 bg-bg-card/20 backdrop-blur-md flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-fg-main uppercase">
              {t('nav.customerHub')}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell stub */}
            <button className="p-2 hover:bg-bg-inset border border-transparent hover:border-border-surface/20 rounded-xl text-fg-secondary hover:text-fg-main transition-all cursor-pointer">
              <Bell size={16} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-bg-inset border border-transparent hover:border-border-surface/20 rounded-xl text-fg-secondary hover:text-fg-main transition-all cursor-pointer"
              aria-label={t('common.toggleTheme')}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;
