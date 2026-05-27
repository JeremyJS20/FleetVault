import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { FileText, Search as SearchIcon, Calendar, FileDown } from 'lucide-react';
import { formatCurrency } from '@rent-car/common';
import { useVehicleTypes } from '../../Infrastructure/hooks/useCatalog.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { DataTable } from '../components/ui/DataTable.js';
import { Input } from '../components/ui/Input.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { getAccessToken, apiClient } from '../../Infrastructure/api-client.js';
import { useQuery } from '@tanstack/react-query';

export const RentalQueryPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: vehicleTypesData } = useVehicleTypes({});
  const vehicleTypes = vehicleTypesData?.items || [];

  const buildParams = useCallback(() => {
    const params: Record<string, string> = { page: String(page), limit: '10' };
    if (statusFilter) params.status = statusFilter;
    if (vehicleTypeId) params.vehicleTypeId = vehicleTypeId;
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    return params;
  }, [page, statusFilter, vehicleTypeId, dateFrom, dateTo, searchTerm]);

  const { data, isLoading } = useQuery({
    queryKey: ['rental-report', buildParams()],
    queryFn: async () => {
      const res = await apiClient('/api/reports/rentals', { params: buildParams() });
      return res.data as { items: any[]; total: number; page: number; limit: number; pages: number };
    },
  });

  const rentals = data?.items || [];
  const totalPages = data?.pages || 1;

  const handleExportPdf = async () => {
    try {
      const token = getAccessToken();
      const params = new URLSearchParams(buildParams());
      params.set('format', 'pdf');
      const res = await fetch(`/api/reports/rentals?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to export report');
      const json = await res.json();
      if (json.success && json.data?.pdfUrl) {
        window.open(`/api/uploads/proxy?url=${encodeURIComponent(json.data.pdfUrl)}`, '_blank');
      }
    } catch (err) {
      console.error('Failed to export rental report PDF:', err);
    }
  };

  const handleDownloadContract = async (rental: any) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/rentals/${rental.id}/contract`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to download contract');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Contract_${rental.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download contract PDF:', err);
    }
  };

  const handleDownloadReceipt = async (rental: any) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/rentals/${rental.id}/receipt`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to download receipt');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt_${rental.id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download receipt PDF:', err);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => (
        <span className="font-mono text-xs text-fg-tertiary">
          {String(info.getValue()).slice(0, 8)}
        </span>
      ),
    },
    {
      accessorKey: 'vehicle',
      header: t('dashboard.vehicle'),
      cell: (info) => {
        const vehicle = info.getValue() as any;
        return (
          <div className="flex flex-col">
            <span className="font-bold text-fg-main">
              {vehicle?.brand?.name} {vehicle?.model?.name}
            </span>
            <span className="text-xs text-fg-secondary font-mono">
              {vehicle?.plateNumber}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'customer',
      header: t('dashboard.customer'),
      cell: (info) => {
        const customer = info.getValue() as any;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-fg-main">{customer?.name}</span>
            <span className="text-xs text-fg-tertiary">{customer?.nationalId}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'rentalDate',
      header: t('dashboard.startDate'),
      cell: (info) => (
        <span className="text-xs">
          {new Date(info.getValue() as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: 'scheduledReturnDate',
      header: t('dashboard.endDate'),
      cell: (info) => (
        <span className="text-xs">
          {new Date(info.getValue() as string).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'rentalCost',
      header: t('dashboard.rentalCost'),
      cell: (info) => {
        const rental = info.row.original;
        return <span className="font-bold font-mono">{formatCurrency(rental.totalCost || 0)}</span>;
      },
    },
    {
      id: 'deposit',
      header: t('dashboard.deposit'),
      cell: (info) => {
        const rental = info.row.original;
        if (rental.status !== 'ACTIVE' && rental.status !== 'PENDING') return <span className="font-mono">—</span>;
        const holdTxn = rental.transactions?.find((t: any) => t.type !== 'CHARGE');
        const deposit = holdTxn ? Math.max(0, (holdTxn.amount || 0) - (rental.totalCost || 0)) : 0;
        return <span className="font-mono">{deposit > 0 ? formatCurrency(deposit) : '—'}</span>;
      },
    },
    {
      id: 'totalHeld',
      header: t('dashboard.totalWithDeposit'),
      cell: (info) => {
        const rental = info.row.original;
        let total = rental.totalCost || 0;
        if (rental.status === 'ACTIVE' || rental.status === 'PENDING') {
          const holdTxn = rental.transactions?.find((t: any) => t.type !== 'CHARGE');
          if (holdTxn) total = holdTxn.amount || 0;
        }
        return <span className="font-bold font-mono">{formatCurrency(total)}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: (info) => <StatusBadge status={info.getValue() as string} />,
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: (info) => {
        const rental = info.row.original;
        const isCompleted = rental.status === 'COMPLETED';
        const isActive = rental.status === 'ACTIVE';
        return (
          <div className="flex items-center gap-1.5">
            {(isActive || isCompleted) && (
              <button
                onClick={() => handleDownloadContract(rental)}
                className="h-7 text-[10px] font-bold uppercase tracking-widest px-2 rounded-lg inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                title={t('queryPage.downloadPdf')}
              >
                <FileText size={11} />
                {t('myRentals.contractPdf')}
              </button>
            )}
            {isCompleted && (
              <button
                onClick={() => handleDownloadReceipt(rental)}
                className="h-7 text-[10px] font-bold uppercase tracking-widest px-2 rounded-lg inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                title={t('queryPage.downloadReceipt')}
              >
                <FileText size={11} />
                {t('myRentals.receiptPdf')}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('queryPage.title')}
        description={t('queryPage.subtitle')}
      >
        <Button variant="primary" size="sm" onClick={handleExportPdf} disabled={isLoading || !rentals.length} className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs">
          <FileDown size={13} />
          <span>{t('queryPage.exportReportPdf')}</span>
        </Button>
      </PageHeader>

      {/* Glass card Filters panel */}
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
              placeholder={t('queryPage.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full text-xs min-h-[44px] pl-10 pr-4 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-all"
            />
          </div>
        </div>

        <div className="w-full md:w-44 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
            {t('queryPage.statusFilter')}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
          >
            <option value="">{t('queryPage.all')}</option>
            <option value="PENDING">{t('common.pending')}</option>
            <option value="ACTIVE">{t('common.active')}</option>
            <option value="COMPLETED">{t('common.completed')}</option>
          </select>
        </div>

        <div className="w-full md:w-44 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
            {t('queryPage.vehicleType')}
          </label>
          <select
            value={vehicleTypeId}
            onChange={(e) => { setVehicleTypeId(e.target.value); setPage(1); }}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
          >
            <option value="">{t('queryPage.allVehicleTypes')}</option>
            {vehicleTypes.map((vt: { id: string; name: string }) => (
              <option key={vt.id} value={vt.id}>{vt.name}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-40 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1">
            <Calendar size={13} /> {t('queryPage.dateFrom')}
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
            <Calendar size={13} /> {t('queryPage.dateTo')}
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
        data={rentals}
        isLoading={isLoading}
        pageCount={totalPages}
        pageIndex={page - 1}
        pageSize={10}
        onPageChange={(newIdx) => setPage(newIdx + 1)}
      />
    </div>
  );
};

export default RentalQueryPage;
