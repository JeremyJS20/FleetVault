import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { 
  LayoutDashboard, 
  Car, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  User as UserIcon,
  Search,
  Tags,
  Wrench,
  Layers,
  Droplet,
  Percent,
  Languages
} from 'lucide-react';

interface SidebarProps {
  role: 'admin' | 'customer';
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout, user } = useAuth();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('fleetvault_lang', nextLang);
  };

  const customerLinks = [
    { to: '/customer/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { to: '/customer/browse', labelKey: 'nav.vehicles', icon: Search },
    { to: '/customer/profile', labelKey: 'nav.people', icon: UserIcon },
    { to: '/customer/settings', labelKey: 'common.actions', icon: Settings },
  ];

  const adminGroups = [
    {
      titleKey: 'nav.dashboard',
      links: [
        { to: '/admin/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
        { to: '/admin/reservations', labelKey: 'nav.fleet', icon: Calendar },
      ]
    },
    {
      titleKey: 'nav.fleet',
      links: [
        { to: '/admin/vehicles', labelKey: 'nav.vehicles', icon: Car },
        { to: '/admin/vehicle-types', labelKey: 'nav.vehicleTypes', icon: Tags },
        { to: '/admin/brands', labelKey: 'nav.brands', icon: Wrench },
        { to: '/admin/models', labelKey: 'nav.models', icon: Layers },
        { to: '/admin/fuel-types', labelKey: 'nav.fuelTypes', icon: Droplet },
      ]
    },
    {
      titleKey: 'nav.people',
      links: [
        { to: '/admin/customers', labelKey: 'nav.customers', icon: Users },
        { to: '/admin/employees', labelKey: 'nav.employees', icon: UserIcon },
      ]
    },
    {
      titleKey: 'nav.pricing',
      links: [
        { to: '/admin/seasonal-rates', labelKey: 'nav.seasonalRates', icon: Percent },
        { to: '/admin/settings', labelKey: 'common.actions', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-64 h-screen sticky top-0 bg-bg-card/45 border-r border-border-surface/40 backdrop-blur-xl flex flex-col justify-between p-5 overflow-y-auto">
      <div className="space-y-6">
        {/* Brand & Language Switcher */}
        <div className="flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-primary-end text-white font-extrabold text-lg shadow-md">
              FV
            </div>
            <span className="text-base font-bold tracking-tight text-fg-main">
              FleetVault
            </span>
          </div>
          <button
            onClick={toggleLanguage}
            className="p-2 rounded-xl bg-bg-inset border-border-surface text-fg-secondary hover:text-fg-main transition-all cursor-pointer"
            title={i18n.language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
          >
            <Languages size={15} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-3 rounded-xl bg-bg-inset border border-border-surface/40">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent-primary">
            {role === 'admin' ? t('employees.shift') : t('customers.type')}
          </div>
          <div className="text-xs font-semibold text-fg-main truncate mt-0.5">
            {user?.name || 'Loading...'}
          </div>
          <div className="text-[10px] text-fg-tertiary truncate">
            {user?.email}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-5">
          {role === 'admin' ? (
            adminGroups.map((group) => (
              <div key={group.titleKey} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary px-3">
                  {t(group.titleKey)}
                </span>
                <div className="flex flex-col gap-0.5">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                            isActive
                              ? 'bg-accent-primary/10 border border-accent-primary/25 text-accent-primary shadow-sm'
                              : 'text-fg-secondary hover:bg-bg-inset border border-transparent hover:text-fg-main'
                          }`
                        }
                      >
                        <Icon size={14} />
                        <span>{t(link.labelKey)}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col gap-1">
              {customerLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                        isActive
                          ? 'bg-accent-primary/10 border border-accent-primary/25 text-accent-primary shadow-sm'
                          : 'text-fg-secondary hover:bg-bg-inset border border-transparent hover:text-fg-main'
                      }`
                    }
                  >
                    <Icon size={14} />
                    <span>{t(link.labelKey)}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>
      </div>

      {/* Logout button */}
      <div className="pt-4 border-t border-border-surface mt-4">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
