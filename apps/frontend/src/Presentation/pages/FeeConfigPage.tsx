import React from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { useFeeConfigs } from '../../Infrastructure/hooks/useCatalog.js';
import { formatCurrency } from '@rent-car/common';
import { PageHeader } from '../components/ui/PageHeader.js';
import { DataTable } from '../components/ui/DataTable.js';

export const FeeConfigPage: React.FC = () => {
  const { t } = useTranslation();

  const { data: fees = [], isLoading } = useFeeConfigs();

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'label',
      header: t('feeConfig.fee'),
      cell: (info) => <span className="font-bold text-fg-main">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'key',
      header: t('feeConfig.key'),
      cell: (info) => <span className="text-xs font-mono text-fg-tertiary">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'amount',
      header: t('feeConfig.amount'),
      cell: (info) => <span className="font-mono font-bold text-fg-main">{formatCurrency(info.getValue() as number)}</span>,
    },
    {
      accessorKey: 'description',
      header: t('feeConfig.description'),
      cell: (info) => <span className="text-fg-secondary text-xs">{info.getValue() as string || '—'}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('feeConfig.title')}
        description={t('feeConfig.subtitle')}
      />

      <DataTable
        columns={columns}
        data={fees}
        isLoading={isLoading}
        pageCount={1}
        pageIndex={0}
        pageSize={fees.length || 10}
        onPageChange={() => {}}
      />
    </div>
  );
};

export default FeeConfigPage;
