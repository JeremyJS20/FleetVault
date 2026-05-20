import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { 
  TrendingUp, 
  Car, 
  DollarSign, 
  CalendarDays, 
  Award,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/ui/DataTable.js';
import { Button } from '../components/ui/Button.js';

const revenueData = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 5100 },
  { month: 'Mar', revenue: 5800 },
  { month: 'Apr', revenue: 7200 },
  { month: 'May', revenue: 9400 },
  { month: 'Jun', revenue: 12000 },
];

interface Reservation {
  id: string;
  car: string;
  customer: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Pending' | 'Completed';
  amount: number;
}

const mockReservations: Reservation[] = [
  { id: '1001', car: 'Tesla Model Y', customer: 'David Miller', startDate: '2026-05-18', endDate: '2026-05-22', status: 'Active', amount: 320 },
  { id: '1002', car: 'Porsche Taycan', customer: 'Sophia Chen', startDate: '2026-05-19', endDate: '2026-05-21', status: 'Pending', amount: 590 },
  { id: '1003', car: 'Ford Bronco', customer: 'Marcus Broady', startDate: '2026-05-12', endDate: '2026-05-16', status: 'Completed', amount: 480 },
  { id: '1004', car: 'Audi e-tron', customer: 'Elena Rostova', startDate: '2026-05-20', endDate: '2026-05-25', status: 'Pending', amount: 450 },
];

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR' || user?.role === 'AGENT';

  const columns: ColumnDef<Reservation>[] = [
    {
      accessorKey: 'id',
      header: t('dashboard.reservationId'),
      cell: (info) => <span className="font-mono text-fg-secondary">#{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'car',
      header: t('dashboard.vehicle'),
      cell: (info) => <span className="font-semibold text-fg-main">{info.getValue() as string}</span>,
    },
    {
      accessorKey: isAdmin ? 'customer' : 'startDate',
      header: isAdmin ? t('dashboard.customer') : t('dashboard.startDate'),
      cell: (info) => <span className="text-fg-secondary">{info.getValue() as string}</span>,
    },
    {
      accessorKey: isAdmin ? 'startDate' : 'endDate',
      header: isAdmin ? t('dashboard.startDate') : t('dashboard.endDate'),
      cell: (info) => <span className="text-fg-secondary">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: (info) => {
        const val = info.getValue() as string;
        const colors = 
          val === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
          val === 'Pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
          'bg-fg-tertiary/10 border-border-surface/40 text-fg-secondary';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${colors}`}>
            {val}
          </span>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: t('dashboard.totalCost'),
      cell: (info) => <span className="font-mono font-bold text-fg-main">${info.getValue() as number}</span>,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main">
          {t('dashboard.welcome')}, {user?.name?.split(' ')[0] || 'User'}!
        </h2>
        <p className="text-xs text-fg-secondary mt-1">
          {isAdmin 
            ? t('dashboard.overviewAdmin') 
            : t('dashboard.overviewCustomer')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">{t('dashboard.totalFleetSize')}</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <Car size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">142</span>
                <span className="block text-[10px] text-emerald-500 font-semibold mt-1">
                  <TrendingUp size={12} className="inline mr-1 align-text-top" /> +8% from last month
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">{t('dashboard.activeRentals')}</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <Clock size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">89</span>
                <span className="block text-[10px] text-fg-tertiary font-semibold mt-1">
                  62.6% Utilisation Rate
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">{t('dashboard.monthlyRevenue')}</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-mono">$42,390</span>
                <span className="block text-[10px] text-emerald-500 font-semibold mt-1">
                  <TrendingUp size={12} className="inline mr-1 align-text-top" /> +14.2% MoM growth
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">{t('dashboard.newRegistrations')}</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">34</span>
                <span className="block text-[10px] text-fg-tertiary font-semibold mt-1">
                  Pending verification: 5
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">{t('dashboard.activeBookings')}</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <Car size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">1</span>
                <span className="block text-[10px] text-accent-primary font-semibold mt-1">
                  Tesla Model Y (Active)
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">{t('dashboard.totalBookings')}</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <CalendarDays size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">8</span>
                <span className="block text-[10px] text-fg-tertiary font-semibold mt-1">
                  Joined since Jan 2026
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">{t('dashboard.rewardsProgram')}</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <Award size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">2,450</span>
                <span className="block text-[10px] text-emerald-500 font-semibold mt-1">
                  Gold Tier Member Status
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">{t('dashboard.totalInvested')}</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-mono">$1,840</span>
                <span className="block text-[10px] text-fg-tertiary font-semibold mt-1">
                  Average rental: $230
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-fg-main uppercase tracking-wider">
              {isAdmin ? t('dashboard.revenueGrowth') : t('dashboard.rentalUsage')}
            </h3>
            <p className="text-xs text-fg-secondary mt-0.5">
              {t('dashboard.visualizingTrends')}
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--surface-border)', borderRadius: '12px', fontSize: '11px', color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-fg-main uppercase tracking-wider mb-3">
              {t('dashboard.quickActions')}
            </h3>
            <div className="flex flex-col gap-2.5">
              {isAdmin ? (
                <>
                  <Button variant="primary" size="sm" className="w-full !h-11 !rounded-xl">{t('dashboard.addNewVehicle')}</Button>
                  <Button variant="secondary" size="sm" className="w-full !h-11 !rounded-xl">{t('dashboard.generateInvoices')}</Button>
                  <Button variant="secondary" size="sm" className="w-full !h-11 !rounded-xl">{t('dashboard.systemLogs')}</Button>
                </>
              ) : (
                <>
                  <Button variant="primary" size="sm" className="w-full !h-11 !rounded-xl">{t('dashboard.browseVehicles')}</Button>
                  <Button variant="secondary" size="sm" className="w-full !h-11 !rounded-xl">{t('dashboard.loyaltyDetails')}</Button>
                  <Button variant="secondary" size="sm" className="w-full !h-11 !rounded-xl">{t('dashboard.contactSupport')}</Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border-surface/40 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary block">{t('dashboard.systemHealth')}</span>
            <div className="flex items-center gap-2 text-xs text-fg-secondary">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t('dashboard.allNodesFunctional')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-fg-main uppercase tracking-wider">
            {isAdmin ? t('dashboard.recentOps') : t('dashboard.myHistory')}
          </h3>
          <p className="text-xs text-fg-secondary mt-0.5">
            {t('dashboard.opsSummary')}
          </p>
        </div>

        <DataTable
          columns={columns}
          data={mockReservations}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
