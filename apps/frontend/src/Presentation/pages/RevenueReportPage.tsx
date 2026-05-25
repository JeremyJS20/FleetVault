import React from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Landmark } from 'lucide-react';
import { formatCurrency } from '@rent-car/common';
import { useRevenueReport } from '../../Infrastructure/hooks/useReports.js';
import { PageHeader } from '../components/ui/PageHeader.js';

export const RevenueReportPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: revenueData = [], isLoading } = useRevenueReport();

  // Color palette for the categories
  const colors = ['#00B4D8', '#0E8E9A', '#4EA8DE', '#72EFDD', '#560BAD', '#F72585'];

  // Determine dynamic category keys from the dataset
  const categoryKeys = revenueData.length > 0
    ? Object.keys(revenueData[0]).filter(key => key !== 'month')
    : [];

  // Calculate cumulative revenue of the latest month
  const latestMonthData = revenueData[revenueData.length - 1];
  const latestTotal = latestMonthData
    ? categoryKeys.reduce((sum, key) => sum + (latestMonthData[key] || 0), 0)
    : 0;

  // Calculate global historical revenue
  const totalAccumulated = revenueData.reduce((acc, monthData) => {
    const monthlySum = categoryKeys.reduce((sum, key) => sum + (monthData[key] || 0), 0);
    return acc + monthlySum;
  }, 0);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('revenuePage.title')}
        description={t('revenuePage.subtitle')}
      />

      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md text-fg-secondary font-mono text-xs">
          {t('common.loading')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Revenue Metrics */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-accent-primary/5 rounded-full blur-xl pointer-events-none" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-primary flex items-center gap-1">
                <Landmark size={12} /> {t('revenuePage.financialSummary')}
              </span>
              <h4 className="text-sm font-bold text-fg-secondary uppercase tracking-tight mt-1">
                {t('revenuePage.totalRevenue')}
              </h4>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-fg-main font-mono">
                  {formatCurrency(totalAccumulated)}
                </span>
              </div>
              <p className="text-xs text-fg-tertiary mt-3 leading-relaxed">
                {t('revenuePage.totalRevenueDesc')}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-primary flex items-center gap-1">
                <TrendingUp size={12} /> {t('revenuePage.latestMonth')}
              </span>
              <h4 className="text-sm font-bold text-fg-secondary uppercase tracking-tight mt-1">
                {t('revenuePage.billingsTitle', { month: latestMonthData?.month })}
              </h4>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-fg-main font-mono">
                  {formatCurrency(latestTotal)}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-border-surface/20 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">
                  {t('revenuePage.categoryBreakdown', { month: latestMonthData?.month })}
                </span>
                <div className="flex flex-col gap-1.5 font-mono text-xs">
                  {categoryKeys.map((cat, i) => (
                    <div key={cat} className="flex justify-between items-center text-fg-secondary">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        {cat}
                      </span>
                      <span>{formatCurrency(latestMonthData[cat] || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stacked Area Revenue Chart */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-4 min-h-[420px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1.5 border-b border-border-surface/20 pb-2">
              <DollarSign size={14} className="text-accent-primary" />
              <span>{t('revenuePage.byCategory')}</span>
            </h3>

            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    {categoryKeys.map((cat, i) => (
                      <linearGradient key={cat} id={`color-${cat}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0.0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="month"
                    stroke="var(--text-secondary)"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `RD$ ${val / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--surface-border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-sans)'
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: '10px',
                      fontFamily: 'var(--font-sans)',
                      marginTop: '10px'
                    }}
                  />
                  {categoryKeys.map((cat, i) => (
                    <Area
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stackId="1"
                      stroke={colors[i % colors.length]}
                      fillOpacity={1}
                      fill={`url(#color-${cat})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueReportPage;
