import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { useAdminDashboard, useCustomerDashboard } from '../../Infrastructure/hooks/useDashboard.js';
import { formatCurrency } from '@rent-car/common';
import {
  TrendingUp,
  Car,
  DollarSign,
  CalendarDays,
  CreditCard,
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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hrs = time.getHours();
    if (hrs < 12) return t('dashboard.goodMorning', 'Good morning');
    if (hrs < 18) return t('dashboard.goodAfternoon', 'Good afternoon');
    return t('dashboard.goodEvening', 'Good evening');
  };

  const formattedDate = time.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = time.toLocaleTimeString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMINISTRATOR' || user?.role === 'AGENT';

  const { data: adminData, isLoading: adminLoading } = useAdminDashboard(isAdmin);
  const { data: customerData, isLoading: customerLoading } = useCustomerDashboard(!isAdmin);

  const loading = isAdmin ? adminLoading : customerLoading;

  const chartData = isAdmin
    ? (adminData?.revenueChart || [])
    : (customerData?.monthlySpending || []).map(d => ({ month: d.month, revenue: d.amount }));

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'id',
      header: t('dashboard.reservationId'),
      cell: (info) => <span className="font-mono text-fg-secondary">#{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'car',
      header: t('dashboard.vehicle'),
      cell: (info) => {
        const rental = info.row.original;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-fg-main">{info.getValue() as string}</span>
            <span className="text-[10px] text-fg-tertiary font-mono">{rental.plate}</span>
          </div>
        );
      },
    },
    ...(!isAdmin && customerData?.customerType === 'CORPORATE'
      ? [{
          accessorKey: 'purchaseOrderNumber' as const,
          header: t('dashboard.poNumber'),
          cell: (info: any) => {
            const val = info.getValue() as string | null;
            return val ? <span className="font-mono text-xs text-fg-secondary">{val}</span> : <span className="text-fg-tertiary text-xs">—</span>;
          },
        }]
      : []
    ),
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-fg-main">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!
          </h2>
          <p className="text-xs text-fg-secondary mt-1">
            {isAdmin ? t('dashboard.overviewAdmin') : t('dashboard.overviewCustomer')}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-bg-inset/50 px-4 py-2.5 rounded-xl border border-border-surface/20 shrink-0 self-start sm:self-auto">
          <Clock size={16} className="text-accent-primary animate-pulse" />
          <div className="text-left">
            <span className="block text-xs font-mono font-bold text-fg-main">{formattedTime}</span>
            <span className="block text-[10px] font-semibold text-fg-tertiary capitalize">{formattedDate}</span>
          </div>
        </div>
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
            {customerData.customerType === 'CORPORATE' ? (
              <>
                <StatCard
                  label={t('dashboard.availableCredit')}
                  icon={<DollarSign size={16} />}
                  value={formatCurrency(customerData.creditLimit - customerData.outstandingBalance)}
                  subtext={
                    <div className="space-y-1.5">
                      <span>{t('dashboard.creditUsed', { used: formatCurrency(customerData.outstandingBalance), total: formatCurrency(customerData.creditLimit) })}</span>
                      <div className="w-full h-1.5 rounded-full bg-bg-surface/50 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, customerData.creditUtilizationPct || 0)}%`, background: (customerData.creditUtilizationPct || 0) > 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : (customerData.creditUtilizationPct || 0) > 50 ? 'linear-gradient(90deg, #22c55e, #f59e0b)' : 'linear-gradient(90deg, #22c55e, #16a34a)' }} />
                      </div>
                    </div>
                  }
                  mono
                />
                <StatCard
                  label={t('dashboard.activeBookings')}
                  icon={<Car size={16} />}
                  value={String(customerData.activeBookings)}
                  subtext={customerData.activeVehicle ? t('dashboard.vehicleActive', { vehicle: customerData.activeVehicle }) : t('dashboard.noActiveRental')}
                />
                <StatCard
                  label={t('dashboard.pendingInvoices')}
                  icon={<CreditCard size={16} />}
                  value={String(customerData.poInvoicesCount || 0)}
                  subtext={customerData.activePOAmount ? t('dashboard.pendingInvoicesCount', { count: customerData.poInvoicesCount ?? 0, amount: formatCurrency(customerData.activePOAmount) }) : t('dashboard.noActiveRental')}
                  mono
                />
                <StatCard
                  label={t('dashboard.totalInvested')}
                  icon={<CalendarDays size={16} />}
                  value={formatCurrency(customerData.totalSpent)}
                  subtext={t('dashboard.completedRentals', { count: customerData.completedCount })}
                  mono
                />
              </>
            ) : (
              <>
                <StatCard
                  label={t('dashboard.activeBookings')}
                  icon={<Car size={16} />}
                  value={String(customerData.activeBookings)}
                  subtext={customerData.activeVehicle ? t('dashboard.vehicleActive', { vehicle: customerData.activeVehicle }) : t('dashboard.noActiveRental')}
                />
                <StatCard
                  label={t('dashboard.nextReturn')}
                  icon={<Clock size={16} />}
                  value={customerData.nextReturnDate ? customerData.nextReturnDate : t('dashboard.noUpcomingReturn')}
                  subtext={customerData.nextReturnVehicle ?? ''}
                />
                <StatCard
                  label={t('dashboard.totalInvested')}
                  icon={<DollarSign size={16} />}
                  value={formatCurrency(customerData.totalSpent)}
                  subtext={t('dashboard.completedRentals', { count: customerData.completedCount })}
                  mono
                />
                <StatCard
                  label={t('dashboard.licenseStatus')}
                  icon={<CheckCircle2 size={16} />}
                  value={customerData.licenseStatus === 'valid' ? t('dashboard.licenseValid') : customerData.licenseStatus === 'expiringSoon' ? t('dashboard.licenseExpiring') : t('dashboard.licenseMissing')}
                  subtext={customerData.licenseExpDate ? t('dashboard.licenseExpDate', { date: customerData.licenseExpDate }) : ''}
                />
              </>
            )}
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-fg-main uppercase tracking-wider">
              {isAdmin ? t('dashboard.revenueGrowth') : t('dashboard.monthlySpending')}
            </h3>
            <p className="text-xs text-fg-secondary mt-0.5">
              {isAdmin ? t('dashboard.visualizingTrends') : t('dashboard.spendingTrend')}
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <Button variant="primary" size="sm" className="w-full !h-11 !rounded-xl" onClick={() => navigate('/admin/vehicles')}>{t('dashboard.addNewVehicle')}</Button>
                  <Button variant="secondary" size="sm" className="w-full !h-11 !rounded-xl" onClick={() => navigate('/admin/query')}>{t('dashboard.generateInvoices')}</Button>
                </>
              ) : (
                <>
                  {customerData?.customerType === 'CORPORATE' ? (
                    <>
                      <Button variant="primary" size="sm" className="w-full !h-11 !rounded-xl" onClick={() => navigate('/customer/browse')}>{t('dashboard.newReservation')}</Button>
                      <Button variant="secondary" size="sm" className="w-full !h-11 !rounded-xl" onClick={() => navigate('/customer/invoices')}>{t('dashboard.viewInvoices')}</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="primary" size="sm" className="w-full !h-11 !rounded-xl" onClick={() => navigate('/customer/browse')}>{t('dashboard.browseVehicles')}</Button>
                      {customerData?.activeBookings && customerData.activeBookings > 0 ? (
                        <Button variant="secondary" size="sm" className="w-full !h-11 !rounded-xl" onClick={() => navigate('/customer/rentals')}>{t('dashboard.extendRental')}</Button>
                      ) : null}
                    </>
                  )}
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
