import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { Download, Search as SearchIcon, Calendar } from 'lucide-react';
import { formatCurrency } from '@rent-car/common';
import { useRentalsList } from '../../Infrastructure/hooks/useRentals.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { DataTable } from '../components/ui/DataTable.js';
import { Input } from '../components/ui/Input.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { getAccessToken } from '../../Infrastructure/api-client.js';

export const RentalQueryPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Fetch rentals list from hook
  const { data, isLoading } = useRentalsList({
    status: statusFilter || undefined,
    page,
    limit: 10
  });

  const rentals = data?.items || [];
  const totalPages = data?.pages || 1;

  // Filter rentals locally for fields that are not supported directly by backend pagination filter
  const filteredRentals = rentals.filter((rental) => {
    // 1. Search text filter (customer name, plate, PO number, employee name)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const customerMatch = rental.customer?.name?.toLowerCase().includes(term);
      const plateMatch = rental.vehicle?.plateNumber?.toLowerCase().includes(term);
      const vehicleMatch = `${rental.vehicle?.brand?.name} ${rental.vehicle?.model?.name}`.toLowerCase().includes(term);
      const employeeMatch = rental.checkoutEmployee?.name?.toLowerCase().includes(term);
      const poMatch = rental.purchaseOrderNumber?.toLowerCase().includes(term);
      const idMatch = rental.id?.toLowerCase().includes(term);
      if (!customerMatch && !plateMatch && !vehicleMatch && !employeeMatch && !poMatch && !idMatch) {
        return false;
      }
    }

    // 2. Date filters
    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      const rentalTime = new Date(rental.rentalDate).getTime();
      if (rentalTime < fromTime) return false;
    }

    if (dateTo) {
      const toTime = new Date(dateTo).getTime();
      const rentalTime = new Date(rental.rentalDate).getTime();
      if (rentalTime > toTime) return false;
    }

    return true;
  });

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
      accessorKey: 'totalCost',
      header: t('dashboard.totalCost'),
      cell: (info) => (
        <span className="font-bold font-mono">
          {formatCurrency(info.getValue() as number || 0)}
        </span>
      ),
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownloadContract(rental)}
                className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs"
                title={t('queryPage.downloadPdf')}
              >
                <Download size={13} />
                <span>{t('queryPage.contract')}</span>
              </Button>
            )}
            {isCompleted && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownloadReceipt(rental)}
                className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs"
                title={t('queryPage.downloadReceipt')}
              >
                <Download size={13} />
                <span>{t('queryPage.downloadReceipt')}</span>
              </Button>
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
      />

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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs min-h-[44px] pl-10 pr-4 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-all"
            />
          </div>
        </div>

        <div className="w-full md:w-48 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
            {t('queryPage.statusFilter')}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
          >
            <option value="">{t('queryPage.all')}</option>
            <option value="PENDING">{t('common.pending')}</option>
            <option value="ACTIVE">{t('common.active')}</option>
            <option value="COMPLETED">{t('common.completed')}</option>
          </select>
        </div>

        <div className="w-full md:w-44 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1">
            <Calendar size={13} /> {t('queryPage.dateFrom')}
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="w-full md:w-44 flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1">
            <Calendar size={13} /> {t('queryPage.dateTo')}
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRentals}
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
