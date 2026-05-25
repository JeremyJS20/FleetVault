import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Languages,
  ClipboardCheck,
  DollarSign,
  Map,
  Globe,
  BarChart3,
  TrendingUp,
  Coins
} from 'lucide-react';

interface SidebarProps {
  role: 'admin' | 'customer';
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout, user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('fleetvault_lang', nextLang);
  };

  const customerLinks = [
    { to: '/customer/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { to: '/customer/browse', labelKey: 'nav.vehicles', icon: Search },
    { to: '/customer/reservations', labelKey: 'nav.fleet', icon: Calendar },
    { to: '/customer/profile', labelKey: 'nav.people', icon: UserIcon },
  ];

  const adminGroups = [
    {
      titleKey: 'nav.dashboard',
      links: [
        { to: '/admin/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
        { to: '/admin/reservations', labelKey: 'nav.fleet', icon: Calendar },
        { to: '/admin/inspections', labelKey: 'nav.inspections', icon: ClipboardCheck },
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
        { to: '/admin/fee-config', labelKey: 'nav.feeConfig', icon: DollarSign },
        { to: '/admin/settings', labelKey: 'common.actions', icon: Settings },
      ]
    },
    {
      titleKey: 'nav.tracking',
      links: [
        { to: '/admin/gps/map', labelKey: 'nav.gpsMap', icon: Map },
        { to: '/admin/gps/geofences', labelKey: 'nav.geofenceConfig', icon: Globe },
      ]
    },
    {
      titleKey: 'nav.reports',
      links: [
        { to: '/admin/query', labelKey: 'nav.advancedSearch', icon: Search },
        { to: '/admin/reports/utilization', labelKey: 'nav.utilizationReport', icon: BarChart3 },
        { to: '/admin/reports/revenue', labelKey: 'nav.revenueReport', icon: TrendingUp },
        { to: '/admin/reports/commissions', labelKey: 'nav.commissionsReport', icon: Coins }
      ]
    }
  ];

  const filteredAdminGroups = adminGroups.map((group) => {
    const links = group.links.filter((link) => {
      if (user?.role === 'INSPECTOR') {
        return ['/admin/dashboard', '/admin/reservations', '/admin/inspections', '/admin/vehicles'].includes(link.to);
      }
      if (user?.role === 'AGENT') {
        return !['/admin/employees', '/admin/seasonal-rates', '/admin/fee-config', '/admin/settings'].includes(link.to);
      }
      return true;
    });
    return { ...group, links };
  }).filter((group) => group.links.length > 0);

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
            title={t('common.switchLanguage')}
          >
            <Languages size={15} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-3 rounded-xl bg-bg-inset border border-border-surface/40">
          <div className="text-xs font-bold uppercase tracking-wider text-accent-primary">
            {role === 'admin' ? t('employees.shift') : t('customers.type')}
          </div>
          <div className="text-xs font-semibold text-fg-main truncate mt-0.5">
            {user?.name || t('common.loading')}
          </div>
          <div className="text-xs text-fg-tertiary truncate">
            {user?.email}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-5">
          {role === 'admin' ? (
            filteredAdminGroups.map((group) => (
              <div key={group.titleKey} className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-fg-tertiary px-3">
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
          onClick={() => { logout(); navigate(user?.role === 'CUSTOMER' ? '/' : '/login'); }}
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
