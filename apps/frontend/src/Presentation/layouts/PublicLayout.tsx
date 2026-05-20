import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { useTranslation } from 'react-i18next';
import { Languages, Sun, Moon, LogOut, Compass, LogIn } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

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

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('fleetvault_lang', nextLang);
  };

  const handleWorkspaceRedirect = () => {
    if (!user) return;
    const isStaff = user.role === 'ADMINISTRATOR' || user.role === 'AGENT' || user.role === 'INSPECTOR';
    if (isStaff) {
      navigate('/admin/dashboard');
    } else {
      navigate('/customer/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-fg-main overflow-x-hidden relative">
      {/* Auroral background glows */}
      <div className="absolute top-[-10%] left-[20%] w-[50%] h-[30%] rounded-full bg-accent-primary opacity-5 filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[30%] rounded-full bg-accent-primary-end opacity-5 filter blur-[120px] pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border-surface/40 bg-bg-card/25 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto h-16 px-6 md:px-8 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 select-none group">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-primary-end text-white font-extrabold text-lg shadow-md transition-transform duration-300 group-hover:scale-105">
              FV
            </div>
            <span className="text-base font-bold tracking-tight text-fg-main">
              FleetVault <span className="text-accent-primary font-medium text-xs">Enterprise</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'text-accent-primary bg-accent-primary/5'
                    : 'text-fg-secondary hover:text-fg-main'
                }`
              }
            >
              <Compass size={14} />
              <span>{t('nav.vehicles')}</span>
            </NavLink>
          </nav>

          {/* Utilities & CTA */}
          <div className="flex items-center gap-3">
            
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl hover:bg-bg-inset border border-transparent hover:border-border-surface/20 text-fg-secondary hover:text-fg-main transition-all cursor-pointer"
              title={i18n.language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            >
              <Languages size={16} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-bg-inset border border-transparent hover:border-border-surface/20 text-fg-secondary hover:text-fg-main transition-all cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleWorkspaceRedirect}
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-primary-end text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
                >
                  {t('nav.dashboard')}
                </button>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl border border-transparent hover:border-red-500/20 hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                  title={t('common.logout')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-xs font-bold text-fg-secondary hover:text-fg-main px-3 py-2 transition-colors flex items-center gap-1.5"
                >
                  <LogIn size={14} />
                  {t('auth.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="h-9 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-primary-end text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center"
                >
                  {t('auth.createAccount')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-border-surface/40 text-center text-[10px] font-mono tracking-widest text-fg-tertiary uppercase">
        FleetVault Enterprise · Neo-Minimalist Liquid Glass System
      </footer>
    </div>
  );
};

export default PublicLayout;
