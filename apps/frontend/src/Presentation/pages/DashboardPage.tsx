import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { useAdminDashboard, useCustomerDashboard } from '../../Infrastructure/hooks/useDashboard.js';
import { formatCurrency } from '@rent-car/common';
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

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
  pending: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
  completed: 'bg-fg-tertiary/10 border-border-surface/40 text-fg-secondary',
  cancelled: 'bg-red-500/10 border-red-500/20 text-red-500',
};

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR' || user?.role === 'AGENT';

  const { data: adminData, isLoading: adminLoading } = useAdminDashboard();
  const { data: customerData, isLoading: customerLoading } = useCustomerDashboard();

  const loading = isAdmin ? adminLoading : customerLoading;

  const columns: ColumnDef<any>[] = [
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
    ...(isAdmin
      ? [{
          accessorKey: 'customer' as const,
          header: t('dashboard.customer'),
          cell: (info: any) => <span className="text-fg-secondary">{info.getValue() as string}</span>,
        }]
      : [{
          accessorKey: 'startDate' as const,
          header: t('dashboard.startDate'),
          cell: (info: any) => <span className="text-fg-secondary">{info.getValue() as string}</span>,
        }]
    ),
    {
      accessorKey: isAdmin ? 'startDate' : 'endDate',
      header: isAdmin ? t('dashboard.startDate') : t('dashboard.endDate'),
      cell: (info) => <span className="text-fg-secondary">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: (info) => {
        const val = (info.getValue() as string).toLowerCase();
        const colors = statusColors[val] || statusColors.completed;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider ${colors}`}>
            {info.getValue() as string}
          </span>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: t('dashboard.totalCost'),
      cell: (info) => <span className="font-mono font-bold text-fg-main">{formatCurrency(info.getValue() as number)}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
        <span className="text-xs text-fg-tertiary font-bold tracking-wider">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main">
          {t('dashboard.welcome')}, {user?.name?.split(' ')[0] || 'User'}!
        </h2>
        <p className="text-xs text-fg-secondary mt-1">
          {isAdmin ? t('dashboard.overviewAdmin') : t('dashboard.overviewCustomer')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin && adminData ? (
          <>
            <StatCard
              label={t('dashboard.totalFleetSize')}
              icon={<Car size={16} />}
              value={String(adminData.totalFleetSize)}
              subtext={t('dashboard.vehiclesAvailable', { count: adminData.availableVehicles })}
            />
            <StatCard
              label={t('dashboard.activeRentals')}
              icon={<Clock size={16} />}
              value={String(adminData.activeRentals)}
              subtext={t('dashboard.utilizationRate', { rate: adminData.utilizationRate })}
            />
            <StatCard
              label={t('dashboard.monthlyRevenue')}
              icon={<DollarSign size={16} />}
              value={formatCurrency(adminData.monthlyRevenue)}
              subtext={
                <span className="text-emerald-500">
                  <TrendingUp size={12} className="inline mr-1 align-text-top" />
                  {t('dashboard.revenueGrowthPct', { pct: (adminData.revenueGrowth > 0 ? '+' : '') + adminData.revenueGrowth })}
                </span>
              }
              mono
            />
            <StatCard
              label={t('dashboard.newRegistrations')}
              icon={<CheckCircle2 size={16} />}
              value={String(adminData.newCustomers)}
              subtext={t('dashboard.pendingVerification', { count: adminData.pendingVerification })}
            />
          </>
        ) : customerData ? (
          <>
            <StatCard
              label={t('dashboard.activeBookings')}
              icon={<Car size={16} />}
              value={String(customerData.activeBookings)}
              subtext={customerData.activeVehicle ? t('dashboard.vehicleActive', { vehicle: customerData.activeVehicle }) : t('dashboard.noActiveRental')}
            />
            <StatCard
              label={t('dashboard.totalBookings')}
              icon={<CalendarDays size={16} />}
              value={String(customerData.totalBookings)}
              subtext={t('dashboard.memberSince', { date: customerData.memberSince })}
            />
            <StatCard
              label={t('dashboard.rewardsProgram')}
              icon={<Award size={16} />}
              value={String(customerData.totalBookings * 100)}
              subtext={customerData.totalBookings > 5 ? t('dashboard.goldTier') : t('dashboard.silverTier')}
            />
            <StatCard
              label={t('dashboard.totalInvested')}
              icon={<DollarSign size={16} />}
              value={formatCurrency(customerData.totalSpent)}
              subtext={t('dashboard.averageRental', { amount: formatCurrency(customerData.averageRental) })}
              mono
            />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-fg-main uppercase tracking-wider">
              {t('dashboard.revenueGrowth')}
            </h3>
            <p className="text-xs text-fg-secondary mt-0.5">
              {t('dashboard.visualizingTrends')}
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={adminData?.revenueChart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <span className="text-xs font-bold uppercase tracking-wider text-fg-tertiary block">{t('dashboard.systemHealth')}</span>
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
          data={isAdmin ? (adminData?.recentRentals || []) : (customerData?.recentRentals || [])}
        />
      </div>
    </div>
  );
};

function StatCard({ label, icon, value, subtext, mono }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  subtext: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-fg-secondary">{label}</span>
        <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
          {icon}
        </div>
      </div>
      <div>
        <span className={`text-3xl font-extrabold text-fg-main tracking-tight ${mono ? 'font-mono' : 'font-sans'}`}>
          {value}
        </span>
        <span className="block text-xs text-fg-tertiary font-semibold mt-1">
          {subtext}
        </span>
      </div>
    </div>
  );
}

export default DashboardPage;
