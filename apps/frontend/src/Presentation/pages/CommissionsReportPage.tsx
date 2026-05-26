import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, DollarSign, CheckCircle2, UserCheck, ShieldAlert, FileDown } from 'lucide-react';
import { formatCurrency } from '@rent-car/common';
import { useCommissionsReport } from '../../Infrastructure/hooks/useReports.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { Toast } from '../components/ui/Toast.js';
import { apiClient } from '../../Infrastructure/api-client.js';

export const CommissionsReportPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: serverCommissions = [], isLoading } = useCommissionsReport();
  const [downloading, setDownloading] = useState(false);
  
  // Local state to track payouts interactively
  const [commissions, setCommissions] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (serverCommissions.length > 0) {
      setCommissions(serverCommissions);
    }
  }, [serverCommissions]);

  // Simulate marking commission as paid
  const handleMarkPaid = (employeeId: string, employeeName: string) => {
    setCommissions(prev => 
      prev.map(c => c.employeeId === employeeId ? { ...c, payoutStatus: 'PAID' } : c)
    );
    setToast({
      message: `${t('commissionsPage.payoutSuccess')}: ${employeeName}`,
      type: 'success'
    });
  };

  const totalCommissionsUnpaid = commissions
    .filter(c => c.payoutStatus === 'UNPAID')
    .reduce((sum, curr) => sum + curr.commissionAmount, 0);

  const totalCommissionsPaid = commissions
    .filter(c => c.payoutStatus === 'PAID')
    .reduce((sum, curr) => sum + curr.commissionAmount, 0);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await apiClient('/api/reports/commissions?format=pdf');
      const pdfUrl = res.data?.pdfUrl;
      if (pdfUrl) {
        window.open(`/api/uploads/proxy?url=${encodeURIComponent(pdfUrl)}`, '_blank');
      }
    } catch (err) {
      console.error('Failed to download PDF', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('commissionsPage.title')}
        description={t('commissionsPage.subtitle')}
      >
        <Button
          variant="primary"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={downloading || isLoading || commissions.length === 0}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs"
        >
          <FileDown size={13} />
          <span>{downloading ? t('common.loading') : t('common.downloadPdf')}</span>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md text-fg-secondary font-mono text-xs">
          {t('common.loading')}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Metrics summary widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-accent-primary/10 text-accent-primary">
                <DollarSign size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">
                  {t('commissionsPage.totalPaidOut')}
                </span>
                <span className="text-xl font-bold font-mono text-fg-main mt-0.5">
                  {formatCurrency(totalCommissionsPaid)}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldAlert size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">
                  {t('commissionsPage.pendingPayouts')}
                </span>
                <span className="text-xl font-bold font-mono text-fg-main mt-0.5">
                  {formatCurrency(totalCommissionsUnpaid)}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex items-center gap-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <UserCheck size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary">
                  {t('commissionsPage.activeAgents')}
                </span>
                <span className="text-xl font-bold font-mono text-fg-main mt-0.5">
                  {commissions.length}
                </span>
              </div>
            </div>
          </div>

          {/* Payout Matrix Table */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1.5 border-b border-border-surface/20 pb-2">
              <Award size={14} className="text-accent-primary" />
              <span>{t('commissionsPage.payoutMatrix')}</span>
            </h3>

            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-fg-secondary">
                <thead>
                  <tr className="border-b border-border-surface/35 text-fg-tertiary font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">{t('commissionsPage.agent')}</th>
                    <th className="py-3 px-4 text-center">{t('commissionsPage.rateLabel')}</th>
                    <th className="py-3 px-4 text-center">{t('commissionsPage.salesCount')}</th>
                    <th className="py-3 px-4 text-right">{t('commissionsPage.commissionAmount')}</th>
                    <th className="py-3 px-4 text-center">{t('commissionsPage.payoutStatus')}</th>
                    <th className="py-3 px-4 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-surface/20">
                  {commissions.map((c) => (
                    <tr
                      key={c.employeeId}
                      className="hover:bg-bg-inset/20 transition-colors duration-150"
                    >
                      <td className="py-4 px-4 font-bold text-fg-main">
                        {c.name}
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        {c.commissionPercentage}%
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-semibold">
                        {c.salesCount}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-fg-main">
                        {formatCurrency(c.commissionAmount)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.payoutStatus === 'PAID'
                              ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25'
                              : 'text-amber-500 bg-amber-500/10 border-amber-500/25'
                          }`}
                        >
                          {c.payoutStatus === 'PAID' ? (
                            <>
                              <CheckCircle2 size={10} />
                              <span>{t('commissionsPage.paid')}</span>
                            </>
                          ) : (
                            <span>{t('commissionsPage.unpaid')}</span>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {c.payoutStatus === 'UNPAID' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMarkPaid(c.employeeId, c.name)}
                            className="text-[10px] py-1 px-2 rounded-lg"
                          >
                            {t('commissionsPage.markPaid')}
                          </Button>
                        ) : (
                          <span className="text-[10px] text-fg-tertiary italic">{t('commissionsPage.settled')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default CommissionsReportPage;
