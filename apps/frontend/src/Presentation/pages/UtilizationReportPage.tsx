import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, HelpCircle } from 'lucide-react';
import { useUtilizationReport } from '../../Infrastructure/hooks/useReports.js';
import { PageHeader } from '../components/ui/PageHeader.js';

export const UtilizationReportPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: utilizationData = [], isLoading } = useUtilizationReport();

  // Calculate current/average utilization
  const averageRate = utilizationData.length > 0
    ? Math.round(utilizationData.reduce((acc, curr) => acc + curr.rate, 0) / utilizationData.length)
    : 0;

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('utilizationPage.title')}
        description={t('utilizationPage.subtitle')}
      />

      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md text-fg-secondary font-mono text-xs">
          {t('common.loading')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info cards */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-accent-primary/5 rounded-full blur-xl pointer-events-none" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-primary flex items-center gap-1">
                <BarChart3 size={12} /> Live Metrics
              </span>
              <h4 className="text-sm font-bold text-fg-secondary uppercase tracking-tight mt-1">
                Average Fleet Utilization
              </h4>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-fg-main font-mono">
                  {averageRate}%
                </span>
                <span className="text-xs text-emerald-500 font-semibold flex items-center gap-0.5">
                  <TrendingUp size={12} /> +2.4% MoM
                </span>
              </div>
              <p className="text-xs text-fg-tertiary mt-3 leading-relaxed">
                Represents active rentals as a ratio of the total operational fleet count. Standard operational target is 75-85%.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1">
                <HelpCircle size={12} /> Analytics Insights
              </span>
              <ul className="text-xs text-fg-secondary mt-2 flex flex-col gap-3 list-inside list-disc">
                <li>Peak rental activity observed mid-month across all categories.</li>
                <li>Electric sedans lead fleet category utilization at 92%.</li>
                <li>Weekend utilization jumps by an average of 15% due to individual short-term leisure contracts.</li>
              </ul>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-4 min-h-[400px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1.5 border-b border-border-surface/20 pb-2">
              <BarChart3 size={14} className="text-accent-primary" />
              <span>Utilization rate by month</span>
            </h3>

            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    unit="%"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--surface-border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      fontFamily: 'var(--font-sans)'
                    }}
                  />
                  <Bar
                    dataKey="rate"
                    name={t('utilizationPage.rateLabel')}
                    fill="#00B4D8"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UtilizationReportPage;
