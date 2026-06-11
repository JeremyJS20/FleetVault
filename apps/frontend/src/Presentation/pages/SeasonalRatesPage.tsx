import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';

import { useAuth } from '../../Infrastructure/auth.context.js';
import {
  useSeasonalRates,
  useCreateSeasonalRate,
  useUpdateSeasonalRate,
  useToggleSeasonalRateStatus,
} from '../../Infrastructure/hooks/useCatalog.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { SearchBar } from '../components/ui/SearchBar.js';
import { DataTable } from '../components/ui/DataTable.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { FormModal } from '../components/ui/FormModal.js';
import { FormField } from '../components/ui/FormField.js';
import { Input } from '../components/ui/Input.js';
import { ToggleSwitch } from '../components/ui/ToggleSwitch.js';
import { Toast } from '../components/ui/Toast.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { Plus, Pencil } from 'lucide-react';

export const SeasonalRatesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'ADMINISTRATOR';

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query hook
  const { data, isLoading } = useSeasonalRates({ search, status, page, limit });

  // Mutations
  const createMutation = useCreateSeasonalRate();
  const updateMutation = useUpdateSeasonalRate();
  const toggleStatusMutation = useToggleSeasonalRateStatus();

  // Dialog/Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);


  // Form states
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [multiplier, setMultiplier] = useState(1.0);

  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const resetForm = () => {
    setName('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setMultiplier(1.0);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setName(item.name);
    setStartDate(item.startDate ? item.startDate.split('T')[0] : '');
    setEndDate(item.endDate ? item.endDate.split('T')[0] : '');
    setMultiplier(item.multiplier);
    setEditingItem(item);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setFormError(t('seasonalRates.validationNameRequired'));
    if (!startDate) return setFormError(t('seasonalRates.validationStartRequired'));
    if (!endDate) return setFormError(t('seasonalRates.validationEndRequired'));
    if (new Date(startDate) > new Date(endDate)) {
      return setFormError(t('seasonalRates.validationStartBeforeEnd'));
    }
    if (multiplier < 1.01) {
      return setFormError('El multiplicador debe ser mayor a 1.0');
    }

    const payload = {
      name,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      multiplier: Number(multiplier),
    };

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        setToast({ message: t('seasonalRates.updatedSuccess'), type: 'success' });
      } else {
        await createMutation.mutateAsync({
          data: payload,
        });
        setToast({ message: t('seasonalRates.createdSuccess'), type: 'success' });
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || t('common.operationFailed'));
    }
  };

  const handleToggle = async (item: any) => {
    try {
      await toggleStatusMutation.mutateAsync({ id: item.id });
      setToast({ message: t('common.statusUpdated'), type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || t('common.statusUpdateFailed'), type: 'error' });
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: t('seasonalRates.name'),
      cell: (info) => <span className="font-bold text-fg-main">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'multiplier',
      header: t('seasonalRates.multiplier'),
      cell: (info) => {
        const val = info.getValue() as number;
        const pct = Math.round((val - 1) * 100);
        return <span className="font-mono text-xs font-bold text-accent-primary">+{pct}%</span>;
      },
    },
    {
      accessorKey: 'startDate',
      header: t('seasonalRates.startDate'),
      cell: (info) => <span className="font-mono text-xs text-fg-secondary">{(info.getValue() as string).split('T')[0]}</span>,
    },
    {
      accessorKey: 'endDate',
      header: t('seasonalRates.endDate'),
      cell: (info) => <span className="font-mono text-xs text-fg-secondary">{(info.getValue() as string).split('T')[0]}</span>,
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: (info) => <StatusBadge status={info.getValue() as string} />,
    },
  ];

  if (isAdmin) {
    columns.push({
      id: 'actions',
      header: t('common.actions'),
      cell: (info) => {
        const item = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={item.status === 'ACTIVE'}
              onChange={() => setConfirmState({
                title: 'Confirmar',
                message: item.status === 'ACTIVE' ? `¿Desactivar ${item.name}?` : `¿Activar ${item.name}?`,
                onConfirm: () => handleToggle(item),
              })}
              loading={toggleStatusMutation.isPending}
            />
            <button onClick={() => handleOpenEdit(item)} title={t('common.edit')} className="text-accent-primary hover:text-accent-primary/80 transition-colors">
              <Pencil size={14} />
            </button>
          </div>
        );
      },
    });
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('seasonalRates.title')}
        description={t('seasonalRates.subtitle')}
      >
        {isAdmin && (
          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs">
            <Plus size={13} />
            <span>{t('common.create')}</span>
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="w-full md:w-40 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="ACTIVE">{t('common.active')}</option>
          <option value="INACTIVE">{t('common.inactive')}</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        isLoading={isLoading}
        pageIndex={page - 1}
        pageSize={limit}
        pageCount={data?.pages || 1}
        onPageChange={(idx) => setPage(idx + 1)}
      />

      {/* Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? t('seasonalRates.editTitle') : t('seasonalRates.createTitle')}
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
          <FormField label={t('seasonalRates.name')} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('seasonalRates.placeholderName')}
            />
          </FormField>

          <FormField label={t('seasonalRates.multiplier')} required>
              <Input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value))}
                  placeholder="e.g. 1.25"
                />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('seasonalRates.startDate')} required>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </FormField>
            <FormField label={t('seasonalRates.endDate')} required>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </FormField>
          </div>

          {formError && (
            <p className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} type="button">
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </FormModal>



      {/* Confirm Dialog */}
      {confirmState && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmState(null)}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          title={confirmState.title}
          message={confirmState.message}
          isLoading={toggleStatusMutation.isPending}
        />
      )}

      {/* Toast Alert */}
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

export default SeasonalRatesPage;
