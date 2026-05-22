import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { useFeeConfigs, useUpdateFeeConfig } from '../../Infrastructure/hooks/useCatalog.js';
import { formatCurrency } from '@rent-car/common';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { DataTable } from '../components/ui/DataTable.js';
import { FormModal } from '../components/ui/FormModal.js';
import { FormField } from '../components/ui/FormField.js';
import { Input } from '../components/ui/Input.js';
import { Toast } from '../components/ui/Toast.js';

export const FeeConfigPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  const { data: fees = [], isLoading } = useFeeConfigs();
  const updateMutation = useUpdateFeeConfig();

  const [editingFee, setEditingFee] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleOpenEdit = (fee: any) => {
    setEditingFee(fee);
    setEditAmount(fee.amount);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFee) return;
    try {
      await updateMutation.mutateAsync({
        id: editingFee.id,
        data: { amount: editAmount },
      });
      setToast({ message: t('feeConfig.updatedSuccess'), type: 'success' });
      setIsFormOpen(false);
    } catch (err: any) {
      setToast({ message: err.message || t('feeConfig.updateFailed'), type: 'error' });
    }
  };

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

  if (isAdmin) {
    columns.push({
      id: 'actions',
      header: t('common.actions'),
      cell: (info) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenEdit(info.row.original)}
          className="!p-2.5 rounded-xl"
        >
          <Pencil size={15} />
        </Button>
      ),
    });
  }

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

      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={t('feeConfig.editTitle', { label: editingFee?.label || '' })}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <FormField label={t('feeConfig.amountLabel')} required>
            <Input
              type="number"
              min={0}
              step={100}
              value={editAmount}
              onChange={(e) => setEditAmount(Number(e.target.value))}
            />
          </FormField>

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} type="button">
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" isLoading={updateMutation.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </FormModal>

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

export default FeeConfigPage;
