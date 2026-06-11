import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Search as SearchIcon, Calendar, Eye } from 'lucide-react';
import { formatCurrency } from '@rent-car/common';
import { PageHeader } from '../components/ui/PageHeader.js';
import { DataTable } from '../components/ui/DataTable.js';
import { Input } from '../components/ui/Input.js';
import { apiClient } from '../../Infrastructure/api-client.js';
import { useQuery } from '@tanstack/react-query';

function getTransactionContext(type: string, comments: string | null): string | null {
  if (!comments) return null;
  const c = comments.toLowerCase();
  if (c.includes('cancel') || c.includes('inasistencia')) return 'cancellation';
  if (c.includes('devolución') || c.includes('return check-in') || c.includes('check-in completed')) return 'return';
  if (type === 'CASH' && (c.includes('efectivo recibido') || c.includes('mostrador') || c.includes('upfront cash'))) return 'checkout';
  if (c.includes('emitida') || c.includes('bajo oc') || c.includes('invoice under') || c.includes('booked under') || c.includes('invoice for')) return 'checkout';
  return null;
}

export const TransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const typeLabels: Record<string, string> = {
    PRE_AUTH_HOLD: t('transactionsPage.typePreAuthHold'),
    CHARGE: t('transactionsPage.typeCharge'),
    REFUND: t('transactionsPage.typeRefund'),
    PO_INVOICE: t('transactionsPage.typePoInvoice'),
    CASH: t('transactionsPage.typeCash'),
  };

  const buildParams = useCallback(() => {
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (typeFilter) params.type = typeFilter;
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    return params;
  }, [page, typeFilter, dateFrom, dateTo, searchTerm]);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', buildParams()],
    queryFn: async () => {
      const res = await apiClient('/api/transactions', { params: buildParams() });
      return res.data as { items: any[]; total: number; page: number; limit: number; pages: number };
    },
  });

  const items = data?.items || [];
  const totalPages = data?.pages || 1;

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'createdAt',
      header: t('transactionsPage.date'),
      cell: (info) => (
        <span className="text-xs whitespace-nowrap">
          {new Date(info.getValue() as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: t('transactionsPage.type'),
      cell: (info) => {
        const val = info.getValue() as string;
        const label = typeLabels[val] || val;
        const colors: Record<string, string> = {
          PRE_AUTH_HOLD: 'text-blue-400 bg-blue-500/10',
          CHARGE: 'text-emerald-400 bg-emerald-500/10',
          REFUND: 'text-amber-400 bg-amber-500/10',
          PO_INVOICE: 'text-purple-400 bg-purple-500/10',
          CASH: 'text-green-400 bg-green-500/10',
        };
        const ctxColors: Record<string, string> = {
          checkout: 'text-blue-400 bg-blue-500/10',
          return: 'text-emerald-400 bg-emerald-500/10',
          cancellation: 'text-amber-400 bg-amber-500/10',
        };
        const ctxKey = getTransactionContext(val, info.row.original.comments);
        const ctx = ctxKey ? t(`transactionsPage.context${ctxKey.charAt(0).toUpperCase() + ctxKey.slice(1)}`) : null;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${colors[val] || 'text-fg-secondary bg-bg-surface/30'}`}>
              {label}
            </span>
            {ctx && (
              <span className={`text-xs font-bold uppercase tracking-wider px-1.5 py-1 rounded-md ${ctxColors[ctxKey!] || 'text-purple-400 bg-purple-500/10'}`}>
                {ctx}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: t('transactionsPage.amount'),
      cell: (info) => (
        <span className="font-bold font-mono text-sm">
          {formatCurrency(info.getValue() as number || 0)}
        </span>
      ),
    },
    {
      accessorKey: 'rental',
      header: t('transactionsPage.customer'),
      cell: (info) => {
        const rental = info.getValue() as any;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-fg-main text-xs">{rental?.customer?.name || '—'}</span>
            <span className="text-xs text-fg-tertiary font-mono">{rental?.customer?.nationalId || ''}</span>
          </div>
        );
      },
    },
    {
      id: 'rentalRef',
      header: t('transactionsPage.rental'),
      cell: (info) => {
        const rental = info.row.original.rental;
        return (
          <span className="font-mono text-xs text-fg-tertiary">
            {rental?.id ? rental.id.slice(0, 8) : '—'}
          </span>
        );
      },
    },
    {
      id: 'paymentMethod',
      header: t('transactionsPage.paymentMethod'),
      cell: (info) => {
        const txn = info.row.original as any;
        if (txn.type === 'CASH') return <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md text-green-400 bg-green-500/10">{t('transactionsPage.paymentMethodCash')}</span>;
        if (txn.type === 'PO_INVOICE') return <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md text-purple-400 bg-purple-500/10">{t('transactionsPage.paymentMethodPO')}</span>;
        if (txn.stripePaymentIntentId) return <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md text-blue-400 bg-blue-500/10">{t('transactionsPage.paymentMethodCard')}</span>;
        return <span className="text-xs text-fg-tertiary">—</span>;
      },
    },
    {
      accessorKey: 'comments',
      header: t('transactionsPage.comments'),
      cell: (info) => (
        <span className="text-xs text-fg-secondary max-w-[200px] block truncate">
          {info.getValue() as string || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: (info) => {
        const rentalId = info.row.original.rentalId;
        return rentalId ? (
          <button
            onClick={() => navigate(`/admin/query?rentalId=${rentalId}`)}
            title={t('transactionsPage.viewRental')}
            className="text-accent-primary hover:text-accent-primary/80 transition-colors"
          >
            <Eye size={14} />
          </button>
        ) : null;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('transactionsPage.title')}
        description={t('transactionsPage.subtitle')}
      />

      <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
            {t('common.search')}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-fg-tertiary">
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              placeholder={t('transactionsPage.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full text-xs min-h-[44px] pl-10 pr-4 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-all"
            />
          </div>
        </div>

        <div className="w-full md:w-44 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
            {t('transactionsPage.typeFilter')}
          </label>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
          >
            <option value="">{t('transactionsPage.allTypes')}</option>
            {Object.entries(typeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-40 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1">
            <Calendar size={13} /> {t('transactionsPage.dateFrom')}
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="w-full"
          />
        </div>

        <div className="w-full md:w-40 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1">
            <Calendar size={13} /> {t('transactionsPage.dateTo')}
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="w-full"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        pageCount={totalPages}
        pageIndex={page - 1}
        pageSize={20}
        onPageChange={(newIdx) => setPage(newIdx + 1)}
      />
    </div>
  );
};

export default TransactionsPage;
