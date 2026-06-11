import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@rent-car/common';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { useQuickRegister } from '../../Infrastructure/hooks/useQuickRegister.js';
import { useTranslation } from 'react-i18next';
import { Languages, Sun, Moon, LogOut, Compass, LogIn, AlertCircle, Users } from 'lucide-react';
import { FormModal } from '../components/ui/FormModal.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';

export const PublicLayout: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
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

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register mode state
  const [registerMode, setRegisterMode] = useState(false);
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const quickRegisterMutation = useQuickRegister();

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const DEFAULT_ACCOUNTS = [
    { email: 'admin@fleetvault.com', role: 'ADMINISTRATOR', labelKey: 'auth.defaultAccountAdmin' },
    { email: 'agent@fleetvault.com', role: 'AGENT', labelKey: 'auth.defaultAccountAgent' },
    { email: 'inspector@fleetvault.com', role: 'INSPECTOR', labelKey: 'auth.defaultAccountInspector' },
    { email: 'juan@fleetvault.com', role: 'CUSTOMER', labelKey: 'auth.defaultAccountIndividual' },
    { email: 'empresa@fleetvault.com', role: 'CUSTOMER', labelKey: 'auth.defaultAccountCorporate' },
  ];

  const onLogin = async (data: LoginInput) => {
    setLoginError(null);
    setLoginLoading(true);
    try {
      const loggedInUser = await login(data.email, data.password);
      const isStaff = loggedInUser?.role === 'ADMINISTRATOR' || loggedInUser?.role === 'AGENT' || loggedInUser?.role === 'INSPECTOR';
      if (isStaff) {
        navigate('/admin/dashboard', { replace: true });
      }
      setShowLoginModal(false);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password');
    } finally {
      setLoginLoading(false);
    }
  };

  const onQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    try {
      const res = await quickRegisterMutation.mutateAsync({
        email: regEmail,
        firstName: regFirstName,
        lastName: regLastName,
      });
      if ('exists' in res) {
        setRegError(t('auth.accountExists'));
        return;
      }
      await login(res.accessToken, res.user, res.refreshToken);
      setShowLoginModal(false);
      setRegisterMode(false);
      setRegFirstName('');
      setRegLastName('');
      setRegEmail('');
      navigate('/', { replace: true });
    } catch (err: any) {
      setRegError(err.message || t('common.operationFailed'));
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
            <NavLink
              to="/policies"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'text-accent-primary bg-accent-primary/5'
                    : 'text-fg-secondary hover:text-fg-main'
                }`
              }
            >
              <span>{t('nav.rentalPolicies')}</span>
            </NavLink>
          </nav>

          {/* Utilities & CTA */}
          <div className="flex items-center gap-3">
            
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl hover:bg-bg-inset border border-transparent hover:border-border-surface/20 text-fg-secondary hover:text-fg-main transition-all cursor-pointer"
              title={t('common.switchLanguage')}
            >
              <Languages size={16} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-bg-inset border border-transparent hover:border-border-surface/20 text-fg-secondary hover:text-fg-main transition-all cursor-pointer"
              aria-label={t('common.toggleTheme')}
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
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="text-xs font-bold text-fg-secondary hover:text-fg-main px-3 py-2 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn size={14} />
                  {t('auth.signIn')}
                </button>
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
      <footer className="w-full py-6 border-t border-border-surface/40 text-center text-xs font-mono tracking-widest text-fg-tertiary uppercase">
        {t('common.footer')}
      </footer>

      {/* Login / Register Modal */}
      {showLoginModal && (
        <FormModal isOpen={showLoginModal} onClose={() => { setShowLoginModal(false); setLoginError(null); setRegisterMode(false); setRegError(null); }} title={registerMode ? t('auth.createAccount') : t('auth.signIn')}>
          {registerMode ? (
            <form onSubmit={onQuickRegister} className="space-y-6">
              <span className="text-xs font-bold text-accent-primary uppercase tracking-widest block">{t('auth.quickSignup')}</span>
              <p className="text-xs text-fg-secondary">{t('auth.quickSignupSubtitle')}</p>

              {regError && (
                <div className="p-3 rounded-xl bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {regError}
                </div>
              )}

              <div className="space-y-4">
                <FormField label={t('auth.firstName')} required>
                  <Input type="text" placeholder={t('auth.firstName')} value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} required />
                </FormField>
                <FormField label={t('auth.lastName')} required>
                  <Input type="text" placeholder={t('auth.lastName')} value={regLastName} onChange={(e) => setRegLastName(e.target.value)} required />
                </FormField>
                <FormField label={t('auth.emailAddress')} required>
                  <Input type="email" placeholder={t('auth.emailAddress')} value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                </FormField>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => { setRegisterMode(false); setRegError(null); }} className="text-xs text-accent-primary hover:underline cursor-pointer">
                  {t('auth.signIn')}
                </button>
                <div className="flex gap-2">
                  <Button variant="secondary" type="button" onClick={() => { setShowLoginModal(false); setRegisterMode(false); setRegError(null); }}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" isLoading={quickRegisterMutation.isPending}>
                    {t('auth.continue')}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-6">
              <p className="text-xs text-fg-secondary mb-4">{t('auth.enterCredentials')}</p>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="rounded-xl border border-border-surface/40 bg-bg-card/50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-fg-secondary">
                  <Users size={14} />
                  <span className="text-xs font-semibold tracking-wide">{t('auth.defaultAccounts')}</span>
                </div>
                <div className="text-[11px] text-fg-tertiary">{t('auth.defaultAccountsHint')} — {t('auth.passwordDefault')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => {
                        const emailInput = document.querySelector<HTMLInputElement>('#modal-email');
                        const pwInput = document.querySelector<HTMLInputElement>('#modal-password');
                        if (emailInput) {
                          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                          setter?.call(emailInput, acc.email);
                          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        if (pwInput) {
                          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                          setter?.call(pwInput, 'password123');
                          pwInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        setLoginError(null);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-border-surface/30 bg-bg-inset/50 text-[11px] text-fg-secondary hover:bg-bg-inset hover:text-fg-main transition-all active:scale-95"
                    >
                      {t(acc.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <FormField label={t('auth.emailAddress')} required error={loginErrors.email?.message}>
                  <Input
                    id="modal-email"
                    type="email"
                    placeholder="name@example.com"
                    {...loginRegister('email')}
                  />
                </FormField>

                <FormField label={t('auth.password')} required error={loginErrors.password?.message}>
                  <Input
                    id="modal-password"
                    type="password"
                    placeholder="••••••••"
                    {...loginRegister('password')}
                  />
                </FormField>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => { setRegisterMode(true); setLoginError(null); }} className="text-xs text-accent-primary hover:underline cursor-pointer">
                  {t('auth.createAccount')}
                </button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => { setShowLoginModal(false); setLoginError(null); }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" isLoading={loginLoading}>
                    {t('auth.continue')}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </FormModal>
      )}
    </div>
  );
};

export default PublicLayout;
