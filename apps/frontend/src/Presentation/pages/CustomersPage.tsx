import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Power } from 'lucide-react';
import { useAuth } from '../../Infrastructure/auth.context.js';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useToggleCustomerStatus,
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

export const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const canMutate = user?.role === 'ADMINISTRATOR' || user?.role === 'AGENT';

  // Filters state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query hook
  const { data, isLoading } = useCustomers({ search, page, limit });

  // Mutations
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const toggleStatusMutation = useToggleCustomerStatus();

  // Dialog/Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [creditCardNumber, setCreditCardNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState(0);
  const [type, setType] = useState('INDIVIDUAL');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCountry, setLicenseCountry] = useState('');
  const [licenseExpDate, setLicenseExpDate] = useState('');
  const [licensePhotoUrl, setLicensePhotoUrl] = useState('');
  const [userId, setUserId] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const resetForm = () => {
    setName('');
    setNationalId('');
    setCreditCardNumber('');
    setCreditLimit(0);
    setType('INDIVIDUAL');
    setLicenseNumber('');
    setLicenseCountry('');
    setLicenseExpDate('');
    setLicensePhotoUrl('');
    setUserId('');
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setName(item.name);
    setNationalId(item.nationalId);
    setCreditCardNumber(item.creditCardNumber || '');
    setCreditLimit(item.creditLimit || 0);
    setType(item.type);
    setLicenseNumber(item.licenseNumber || '');
    setLicenseCountry(item.licenseCountry || '');
    setLicenseExpDate(item.licenseExpDate ? item.licenseExpDate.split('T')[0] : '');
    setLicensePhotoUrl(item.licensePhotoUrl || '');
    setUserId(item.userId || '');
    setEditingItem(item);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setFormError('Name is required');
    if (!nationalId.trim()) return setFormError('National ID is required');

    const payload = {
      name,
      nationalId,
      creditCardNumber: creditCardNumber.trim() || undefined,
      creditLimit: Number(creditLimit) || undefined,
      type,
      licenseNumber: licenseNumber.trim() || undefined,
      licenseCountry: licenseCountry.trim() || undefined,
      licenseExpDate: licenseExpDate ? new Date(licenseExpDate).toISOString() : undefined,
      licensePhotoUrl: licensePhotoUrl.trim() || undefined,
      userId: userId.trim() || undefined,
    };

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        setToast({ message: 'Customer updated successfully', type: 'success' });
      } else {
        await createMutation.mutateAsync({
          data: payload,
        });
        setToast({ message: 'Customer created successfully', type: 'success' });
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
      setToast({ message: 'Customer status updated successfully', type: 'success' });
      setIsConfirmOpen(false);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to update status', type: 'error' });
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: t('customers.name'),
      cell: (info) => <span className="font-bold text-fg-main">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'nationalId',
      header: t('customers.nationalId'),
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'type',
      header: t('customers.type'),
      cell: (info) => <span className="font-semibold text-xs text-fg-secondary">{t(`customers.${(info.getValue() as string).toLowerCase()}`)}</span>,
    },
    {
      accessorKey: 'creditLimit',
      header: t('customers.creditLimit'),
      cell: (info) => <span className="font-mono text-xs">${(info.getValue() as number || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: (info) => <StatusBadge status={info.getValue() as string} />,
    },
  ];

  if (canMutate) {
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
        title={t('customers.title')}
        description={t('customers.subtitle')}
      >
        {canMutate && (
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
        title={editingItem ? t('customers.editTitle') : t('customers.createTitle')}
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <FormField label={t('customers.name')} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('customers.placeholderName')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('customers.nationalId')} required>
              <Input
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder={t('customers.placeholderId')}
              />
            </FormField>
            <SelectField
              label={t('customers.type')}
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: 'INDIVIDUAL', label: t('customers.individual') },
                { value: 'CORPORATE', label: t('customers.corporate') },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('customers.creditLimit')}>
              <Input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                placeholder={t('customers.placeholderLimit')}
              />
            </FormField>
            <FormField label={t('customers.creditCardNumber')}>
              <Input
                value={creditCardNumber}
                onChange={(e) => setCreditCardNumber(e.target.value)}
                placeholder={t('customers.placeholderCard')}
              />
            </FormField>
          </div>

          <div className="border-t border-surface-border my-2 pt-2">
            <h4 className="text-xs font-bold text-accent-primary uppercase tracking-wider mb-3">
              Driver License Verification
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t('customers.licenseNumber')}>
                <Input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder={t('customers.placeholderLicense')}
                />
              </FormField>
              <FormField label={t('customers.licenseCountry')}>
                <Input
                  value={licenseCountry}
                  onChange={(e) => setLicenseCountry(e.target.value)}
                  placeholder={t('customers.placeholderCountry')}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <FormField label={t('customers.licenseExpDate')}>
                <Input
                  type="date"
                  value={licenseExpDate}
                  onChange={(e) => setLicenseExpDate(e.target.value)}
                />
              </FormField>
              <FormField label={t('customers.licensePhotoUrl')}>
                <Input
                  value={licensePhotoUrl}
                  onChange={(e) => setLicensePhotoUrl(e.target.value)}
                  placeholder="https://example.com/license.jpg"
                />
              </FormField>
            </div>
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

      {/* Confirm Status Change Modal */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmToggle}
        title="Change Customer Status"
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

export default CustomersPage;
