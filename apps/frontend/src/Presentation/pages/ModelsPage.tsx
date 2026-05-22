import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Power } from 'lucide-react';
import { useAuth } from '../../Infrastructure/auth.context.js';
import {
  useModels,
  useBrands,
  useCreateModel,
  useUpdateModel,
  useToggleModelStatus,
} from '../../Infrastructure/hooks/useCatalog.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { SearchBar } from '../components/ui/SearchBar.js';
import { DataTable } from '../components/ui/DataTable.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { FormModal } from '../components/ui/FormModal.js';
import { FormField } from '../components/ui/FormField.js';
import { Input } from '../components/ui/Input.js';
import { SelectField } from '../components/ui/SelectField.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { Toast } from '../components/ui/Toast.js';

export const ModelsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  // Filters state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query hook for models
  const { data, isLoading } = useModels({ search, page, limit });

  // Query hook for active brands list (for the dropdown)
  const { data: brandsData } = useBrands({ status: 'ACTIVE', limit: 100 });

  // Mutations
  const createMutation = useCreateModel();
  const updateMutation = useUpdateModel();
  const toggleStatusMutation = useToggleModelStatus();

  // Dialog/Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleOpenCreate = () => {
    setName('');
    // Default to the first brand in the dropdown if available
    setBrandId(brandsData?.items?.[0]?.id || '');
    setEditingItem(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setName(item.name);
    setBrandId(item.brandId);
    setEditingItem(item);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(t('models.validationNameRequired'));
      return;
    }
    if (!brandId) {
      setFormError(t('models.validationBrandRequired'));
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: { name, brandId },
        });
        setToast({ message: t('models.updatedSuccess'), type: 'success' });
      } else {
        await createMutation.mutateAsync({
          data: { name, brandId },
        });
        setToast({ message: t('models.createdSuccess'), type: 'success' });
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || t('common.operationFailed'));
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
      setToast({ message: t('common.statusUpdated'), type: 'success' });
      setIsConfirmOpen(false);
    } catch (err: any) {
      setToast({ message: err.message || t('common.statusUpdateFailed'), type: 'error' });
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: t('models.name'),
      cell: (info) => <span className="font-bold text-fg-main">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'brand.name',
      header: t('models.brand'),
      cell: (info) => <span className="font-semibold text-fg-secondary">{info.getValue() as string || '—'}</span>,
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

  // Format brands option list
  const brandOptions = (brandsData?.items || []).map((b: any) => ({
    value: b.id,
    label: b.name,
  }));

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('models.title')}
        description={t('models.subtitle')}
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
        title={editingItem ? t('models.editTitle') : t('models.createTitle')}
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
          <FormField label={t('models.name')} required error={formError && !name ? 'Model name is required' : undefined}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('models.placeholderName')}
            />
          </FormField>

          <SelectField
            label={t('models.brand')}
            required
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            options={brandOptions}
            error={formError && !brandId ? 'Brand is required' : undefined}
          />

          {brandOptions.length === 0 && (
            <p className="text-xs text-amber-500 font-semibold">
              Warning: No active brands found. Please create and activate a brand first.
            </p>
          )}

          {formError && (
            <p className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} type="button">
              {t('common.cancel')}
            </Button>
            <Button variant="primary" type="submit" disabled={brandOptions.length === 0} isLoading={createMutation.isPending || updateMutation.isPending}>
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
        title={t('common.toggleStatus')}
        message={t('common.confirmStatusChangeMsg', { name: confirmItem?.name })}
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

export default ModelsPage;
