import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Power } from 'lucide-react';
import { useAuth } from '../../Infrastructure/auth.context.js';
import {
  useFuelTypes,
  useCreateFuelType,
  useUpdateFuelType,
  useToggleFuelTypeStatus,
} from '../../Infrastructure/hooks/useCatalog.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { SearchBar } from '../components/ui/SearchBar.js';
import { DataTable } from '../components/ui/DataTable.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { FormModal } from '../components/ui/FormModal.js';
import { FormField } from '../components/ui/FormField.js';
import { Input } from '../components/ui/Input.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { Toast } from '../components/ui/Toast.js';

export const FuelTypesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  // Filters state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query hook
  const { data, isLoading } = useFuelTypes({ search, page, limit });

  // Mutations
  const createMutation = useCreateFuelType();
  const updateMutation = useUpdateFuelType();
  const toggleStatusMutation = useToggleFuelTypeStatus();

  // Dialog/Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleOpenCreate = () => {
    setName('');
    setEditingItem(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setName(item.name);
    setEditingItem(item);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Fuel type name is required');
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: { name },
        });
        setToast({ message: 'Fuel type updated successfully', type: 'success' });
      } else {
        await createMutation.mutateAsync({
          data: { name },
        });
        setToast({ message: 'Fuel type created successfully', type: 'success' });
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleOpenToggle = (item: any) => {
    setConfirmItem(item);
    setIsConfirmOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!confirmItem) return;
    try {
      await toggleStatusMutation.mutateAsync({ id: confirmItem.id });
      setToast({ message: 'Status updated successfully', type: 'success' });
      setIsConfirmOpen(false);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: t('fuelTypes.name'),
      cell: (info) => <span className="font-bold text-fg-main">{info.getValue() as string}</span>,
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
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenEdit(item)}
              title={t('common.edit')}
              className="!p-2.5 rounded-xl"
            >
              <Pencil size={15} />
            </Button>
            <Button
              variant={item.status === 'ACTIVE' ? 'danger' : 'primary'}
              size="sm"
              onClick={() => handleOpenToggle(item)}
              title={t('common.toggleStatus')}
              className="!p-2.5 rounded-xl"
            >
              <Power size={15} />
            </Button>
          </div>
        );
      },
    });
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('fuelTypes.title')}
        description={t('fuelTypes.subtitle')}
      >
        {isAdmin && (
          <Button variant="primary" onClick={handleOpenCreate}>
            {t('common.create')}
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} />
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
        title={editingItem ? t('fuelTypes.editTitle') : t('fuelTypes.createTitle')}
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <FormField label={t('fuelTypes.name')} required error={formError && !name ? 'Fuel type name is required' : undefined}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('fuelTypes.placeholderName')}
            />
          </FormField>

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

      {/* Confirm Status Change Modal */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmToggle}
        title="Toggle Status"
        message={`Are you sure you want to change the status of ${confirmItem?.name}?`}
        isLoading={toggleStatusMutation.isPending}
      />

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

export default FuelTypesPage;
