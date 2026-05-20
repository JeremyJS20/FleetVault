import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/Infrastructure/auth.context.js';
import { 
  LayoutDashboard, 
  Car, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  User as UserIcon,
  Search
} from 'lucide-react';

interface SidebarProps {
  role: 'admin' | 'customer';
}

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout, user } = useAuth();

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/fleet', label: 'Fleet Management', icon: Car },
    { to: '/admin/reservations', label: 'Reservations', icon: Calendar },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const customerLinks = [
    { to: '/customer/dashboard', label: 'My Rentals', icon: LayoutDashboard },
    { to: '/customer/browse', label: 'Browse Cars', icon: Search },
    { to: '/customer/profile', label: 'My Profile', icon: UserIcon },
    { to: '/customer/settings', label: 'Settings', icon: Settings },
  ];

  const links = role === 'admin' ? adminLinks : customerLinks;

  return (
    <aside className="w-64 h-screen sticky top-0 bg-bg-card/45 border-r border-border-surface/40 backdrop-blur-xl flex flex-col justify-between p-6">
      <div className="space-y-8">
        {/* Brand */}
        <div className="flex items-center gap-3 select-none">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-primary-end text-white font-extrabold text-lg shadow-md">
            FV
          </div>
          <span className="text-lg font-bold tracking-tight text-fg-main">
            FleetVault
          </span>
        </div>

        {/* User Info */}
        <div className="p-3.5 rounded-xl bg-bg-inset border border-border-surface/40">
          <div className="text-[10px] font-bold uppercase tracking-wider text-accent-primary">
            {role === 'admin' ? 'Administrator' : 'Customer'}
          </div>
          <div className="text-xs font-semibold text-fg-main truncate mt-0.5">
            {user?.name || 'Loading...'}
          </div>
          <div className="text-[10px] text-fg-tertiary truncate">
            {user?.email}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-accent-primary/10 border border-accent-primary/25 text-accent-primary shadow-sm'
                      : 'text-fg-secondary hover:bg-bg-inset border border-transparent hover:text-fg-main'
                  }`
                }
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout button */}
      <div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
