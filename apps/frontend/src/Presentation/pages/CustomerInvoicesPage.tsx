import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiClient } from '../../Infrastructure/api-client.js';
import { formatCurrency } from '@rent-car/common';
import { Pagination } from '../components/ui/Pagination.js';
import { FileText, Receipt, AlertCircle, ArrowRight } from 'lucide-react';

const TYPE_LABELS: Record<string, { es: string; en: string }> = {
  PRE_AUTH_HOLD: { es: 'Pre-Autorización', en: 'Pre-Auth Hold' },
  CHARGE: { es: 'Cobro', en: 'Charge' },
  REFUND: { es: 'Reembolso', en: 'Refund' },
  PO_INVOICE: { es: 'Factura OC', en: 'PO Invoice' },
  CASH: { es: 'Efectivo', en: 'Cash' },
};

const TYPE_COLORS: Record<string, string> = {
  PRE_AUTH_HOLD: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  CHARGE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  REFUND: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  PO_INVOICE: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  CASH: 'text-green-400 bg-green-500/10 border-green-500/20',
};

function getTransactionContext(type: string, comments: string | null, lang: string): string | null {
  if (!comments) return null;
  const c = comments.toLowerCase();
  if (c.includes('cancel') || c.includes('inasistencia')) return lang === 'es' ? 'Cancelación' : 'Cancellation';
  if (c.includes('devolución') || c.includes('return check-in') || c.includes('check-in completed')) return lang === 'es' ? 'Devolución' : 'Return';
  if (type === 'CASH' && (c.includes('efectivo recibido') || c.includes('mostrador') || c.includes('upfront cash'))) return lang === 'es' ? 'Salida' : 'Checkout';
  if (c.includes('emitida') || c.includes('bajo oc') || c.includes('invoice under') || c.includes('booked under') || c.includes('invoice for')) return lang === 'es' ? 'Salida' : 'Checkout';
  return null;
}

export const CustomerInvoicesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  const lang = i18n.language?.startsWith('es') ? 'es' : 'en';

  useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient('/api/transactions/me', { params: { page: String(page), limit: String(limit) } });
        setTransactions(res.data?.items || []);
        setTotalPages(res.data?.pages || 1);
        setTotalRecords(res.data?.total || 0);
      } catch (err: any) {
        setError(err.message || t('common.operationFailed'));
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [page, limit]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
        <span className="text-xs text-fg-tertiary font-bold tracking-wider">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main uppercase">
          {lang === 'es' ? 'Historial de Facturación' : 'Billing History'}
        </h2>
        <p className="text-xs text-fg-secondary mt-1">
          {lang === 'es'
            ? 'Consulte todas sus transacciones, facturas y recibos.'
            : 'View all your transactions, invoices, and receipts.'}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-accent-error/10 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!isLoading && transactions.length === 0 && (
        <div className="text-center py-20 p-6 rounded-2xl border border-dashed border-border-surface/40 bg-bg-surface/10">
          <p className="text-sm font-bold text-fg-secondary">
            {lang === 'es' ? 'No hay transacciones registradas' : 'No transactions recorded'}
          </p>
          <p className="text-xs text-fg-tertiary mt-1">
            {lang === 'es'
              ? 'Las transacciones aparecerán cuando realice una reserva.'
              : 'Transactions will appear once you make a reservation.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {transactions.map((txn: any) => (
          <div
            key={txn.id}
            className="p-4 rounded-2xl border border-border-surface/30 bg-bg-card/45 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-border-surface transition-all"
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${TYPE_COLORS[txn.type] || 'text-fg-secondary bg-bg-surface/30 border-border-surface/20'}`}>
                {txn.type === 'PO_INVOICE' ? <Receipt className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${TYPE_COLORS[txn.type] || 'text-fg-secondary bg-bg-surface/30'}`}>
                    {TYPE_LABELS[txn.type]?.[lang] || txn.type}
                  </span>
                  {(txn.type === 'PO_INVOICE' || txn.type === 'CASH') && (() => {
                    const ctx = getTransactionContext(txn.type, txn.comments, lang);
                    const ctxColors: Record<string, string> = {
                      Salida: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                      Checkout: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                      Devolución: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      Return: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                      Cancelación: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      Cancellation: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                    };
                    return ctx ? (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${ctxColors[ctx] || 'text-purple-300/70'}`}>
                        {ctx}
                      </span>
                    ) : null;
                  })()}
                  <span className="text-[10px] text-fg-tertiary font-mono">
                    {new Date(txn.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs">
                  <span className="font-bold font-mono text-fg-main">
                    {formatCurrency(txn.amount || 0)}
                  </span>
                  {txn.rental && (
                    <span className="text-fg-tertiary flex items-center gap-1">
                      {txn.rental.vehicle?.vehicleType?.name} • {txn.rental.vehicle?.plateNumber}
                    </span>
                  )}
                  {txn.purchaseOrderNumber && (
                    <span className="text-fg-tertiary font-mono">
                      PO: {txn.purchaseOrderNumber}
                    </span>
                  )}
                </div>

                {txn.comments && (
                  <p className="text-[10px] text-fg-tertiary mt-1 line-clamp-1">{txn.comments}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              {txn.rental && (
                <Link
                  to={`/customer/reservations?rentalId=${txn.rental.id}`}
                  className="text-[10px] font-bold uppercase tracking-wider text-accent-primary hover:text-accent-primary/80 transition-colors flex items-center gap-1"
                >
                  {lang === 'es' ? 'Ver Reserva' : 'View Rental'}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
};

export default CustomerInvoicesPage;
