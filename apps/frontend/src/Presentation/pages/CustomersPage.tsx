import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';

import { useAuth } from '../../Infrastructure/auth.context.js';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useToggleCustomerStatus,
} from '../../Infrastructure/hooks/useCatalog.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { LicensePhotoCapture } from '../components/ui/LicensePhotoCapture.js';
import { useUploadImage } from '../../Infrastructure/hooks/useUploads.js';
import { Button } from '../components/ui/Button.js';
import { SearchBar } from '../components/ui/SearchBar.js';
import { DataTable } from '../components/ui/DataTable.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { FormModal } from '../components/ui/FormModal.js';
import { formatCurrency } from '@rent-car/common';
import { FormField } from '../components/ui/FormField.js';
import { Input } from '../components/ui/Input.js';
import { SelectField } from '../components/ui/SelectField.js';
import { ToggleSwitch } from '../components/ui/ToggleSwitch.js';
import { Toast } from '../components/ui/Toast.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { Plus, Pencil } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const canMutate = user?.role === 'ADMINISTRATOR' || user?.role === 'AGENT';

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query hook
  const { data, isLoading } = useCustomers({ search, status, type: customerType, page, limit });

  // Mutations
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const toggleStatusMutation = useToggleCustomerStatus();
  const uploadMutation = useUploadImage();

  // Pending file to upload on form submit
  const [pendingLicenseFile, setPendingLicenseFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Dialog/Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const [formStep, setFormStep] = useState(1);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
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
    setEmail('');
    setPhone('');
    setAddress('');
    setNationalId('');
    setCreditLimit(0);
    setType('INDIVIDUAL');
    setLicenseNumber('');
    setLicenseCountry('');
    setLicenseExpDate('');
    setLicensePhotoUrl('');
    setUserId('');
    setPendingLicenseFile(null);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingItem(null);
    setFormStep(1);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setName(item.name);
    setEmail(item.email || '');
    setPhone(item.phone || '');
    setAddress(item.address || '');
    setNationalId(item.nationalId);
    setCreditLimit(item.creditLimit || 0);
    setType(item.type);
    setLicenseNumber(item.licenseNumber || '');
    setLicenseCountry(item.licenseCountry || '');
    setLicenseExpDate(item.licenseExpDate ? item.licenseExpDate.split('T')[0] : '');
    setLicensePhotoUrl(item.licensePhotoUrl || '');
    setUserId(item.userId || '');
    setPendingLicenseFile(null);
    setEditingItem(item);
    setFormError(null);
    setFormStep(1);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setFormError(t('customers.validationNameRequired'));
    if (!nationalId.trim()) return setFormError(t('customers.validationIdRequired'));
    if (!email.trim()) return setFormError(t('customers.validationEmailRequired', 'Email is required'));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return setFormError(t('customers.validationEmailInvalid', 'Invalid email format'));
    }

    if (formStep === 1 && type !== 'CORPORATE') {
      setFormError(null);
      setFormStep(2);
      return;
    }

    if (type !== 'CORPORATE' && licenseExpDate) {
      const expDate = new Date(licenseExpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        return setFormError(t('customers.validationLicenseExpired'));
      }
    }

    try {
      if (editingItem) {
        let finalPhotoUrl = licensePhotoUrl;

        if (pendingLicenseFile && type !== 'CORPORATE') {
          setIsUploadingPhoto(true);
          setFormError(t('customers.uploadingPhoto', 'Uploading photo...'));
          const uploadResult = await uploadMutation.mutateAsync({
            file: pendingLicenseFile,
            folder: 'licenses',
            entityType: 'customer',
            entityId: editingItem.id,
          });
          finalPhotoUrl = uploadResult.url;
          setPendingLicenseFile(null);
          setIsUploadingPhoto(false);
        }

        const payload = {
          name,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          nationalId,
          creditLimit: type === 'CORPORATE' ? (Number(creditLimit) || 0) : 0,
          type,
          licenseNumber: type === 'CORPORATE' ? null : (licenseNumber.trim() || undefined),
          licenseCountry: type === 'CORPORATE' ? null : (licenseCountry.trim() || undefined),
          licenseExpDate: (type !== 'CORPORATE' && licenseExpDate) ? new Date(licenseExpDate).toISOString() : null,
          licensePhotoUrl: type === 'CORPORATE' ? null : (finalPhotoUrl?.startsWith('blob:') ? undefined : (finalPhotoUrl.trim() || undefined)),
          userId: userId.trim() || undefined,
        };

        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        setToast({ message: t('customers.updatedSuccess'), type: 'success' });
      } else {
        const payload = {
          name,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          nationalId,
          creditLimit: type === 'CORPORATE' ? (Number(creditLimit) || 0) : 0,
          type,
          licenseNumber: type === 'CORPORATE' ? null : (licenseNumber.trim() || undefined),
          licenseCountry: type === 'CORPORATE' ? null : (licenseCountry.trim() || undefined),
          licenseExpDate: (type !== 'CORPORATE' && licenseExpDate) ? new Date(licenseExpDate).toISOString() : null,
          userId: userId.trim() || undefined,
        };

        const created = await createMutation.mutateAsync({ data: payload });

        if (pendingLicenseFile && type !== 'CORPORATE') {
          setIsUploadingPhoto(true);
          setFormError(t('customers.uploadingPhoto', 'Uploading photo...'));
          const uploadResult = await uploadMutation.mutateAsync({
            file: pendingLicenseFile,
            folder: 'licenses',
            entityType: 'customer',
            entityId: created.id,
          });
          setPendingLicenseFile(null);
          setIsUploadingPhoto(false);

          await updateMutation.mutateAsync({
            id: created.id,
            data: { licensePhotoUrl: uploadResult.url },
          });
        }

        setToast({ message: t('customers.createdSuccess'), type: 'success' });
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
      header: t('customers.name'),
      cell: (info) => <span className="font-bold text-fg-main">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'email',
      header: t('customers.email', 'Email'),
      cell: (info) => <span className="text-xs text-fg-secondary">{(info.getValue() as string) || '—'}</span>,
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
      cell: (info) => {
        const item = info.row.original;
        if (item.type === 'INDIVIDUAL') return <span className="text-fg-tertiary font-bold">—</span>;
        return <span className="font-mono text-xs">{formatCurrency(info.getValue() as number || 0)}</span>;
      },
    },
    {
      id: 'outstandingBalance',
      header: t('customers.outstandingBalance', 'Outstanding'),
      cell: (info) => {
        const item = info.row.original;
        if (item.type === 'INDIVIDUAL') return <span className="text-fg-tertiary font-bold">—</span>;
        return <span className="font-mono text-xs text-fg-secondary">{formatCurrency(item.outstandingBalance || 0)}</span>;
      },
    },
    {
      id: 'availableCredit',
      header: t('customers.availableCredit', 'Available'),
      cell: (info) => {
        const item = info.row.original;
        if (item.type === 'INDIVIDUAL') return <span className="text-fg-tertiary font-bold">—</span>;
        const available = (item.creditLimit || 0) - (item.outstandingBalance || 0);
        return (
          <span className={`font-mono text-xs font-extrabold ${available < 0 ? 'text-accent-error' : 'text-emerald-500'}`}>
            {formatCurrency(available)}
          </span>
        );
      },
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
        title={t('customers.title')}
        description={t('customers.subtitle')}
      >
        {canMutate && (
          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs">
            <Plus size={13} />
            <span>{t('common.create')}</span>
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} />
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={customerType}
            onChange={(e) => { setCustomerType(e.target.value); setPage(1); }}
            className="w-full md:w-40 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
          >
            <option value="">{t('common.allTypes')}</option>
            <option value="INDIVIDUAL">{t('customers.individual')}</option>
            <option value="CORPORATE">{t('customers.corporate')}</option>
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full md:w-40 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
          >
            <option value="">{t('common.allStatuses')}</option>
            <option value="ACTIVE">{t('common.active')}</option>
            <option value="SUSPENDED">{t('common.suspended')}</option>
          </select>
        </div>
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
        title={
          (editingItem ? t('customers.editTitle') : t('customers.createTitle')) + 
          (type === 'CORPORATE' ? '' : ` (${formStep}/2)`)
        }
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
          {/* Stepper Progress Indicator */}
          {type !== 'CORPORATE' && (
            <div className="flex gap-1.5 mb-1">
              <div className={`h-1 flex-1 rounded-full ${formStep >= 1 ? 'bg-accent-primary' : 'bg-white/10'}`} />
              <div className={`h-1 flex-1 rounded-full ${formStep >= 2 ? 'bg-accent-primary' : 'bg-white/10'}`} />
            </div>
          )}

          {/* Dynamic Step Header */}
          {type !== 'CORPORATE' && (
            <span className="text-xs font-extrabold text-accent-primary uppercase tracking-widest block leading-none mb-1">
              {formStep === 1 
                ? t('customers.stepGeneral', 'Step 1: General Info & Credit') 
                : t('customers.stepLicense', 'Step 2: Driver Credentials')
              }
            </span>
          )}

          {/* STEP 1: General Info & Credit */}
          {formStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <FormField label={t('customers.name')} required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('customers.placeholderName')}
                  className="!h-9 rounded-lg"
                />
              </FormField>

              <FormField label={t('customers.email', 'Email')} required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('customers.placeholderEmail', 'customer@example.com')}
                  className="!h-9 rounded-lg"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('customers.phone', 'Phone')}>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('customers.placeholderPhone', '(809) 555-1234')}
                    className="!h-9 rounded-lg"
                  />
                </FormField>
                <FormField label={t('customers.address', 'Address')}>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('customers.placeholderAddress', '123 Main St')}
                    className="!h-9 rounded-lg"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('customers.nationalId')} required>
                  <Input
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder={t('customers.placeholderId')}
                    className="!h-9 rounded-lg"
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

              {type === 'CORPORATE' && (
                <FormField label={t('customers.creditLimit')}>
                  <Input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    placeholder={t('customers.placeholderLimit')}
                    className="!h-9 rounded-lg"
                  />
                </FormField>
              )}

              {formError && (
                <p className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setIsFormOpen(false)} type="button">
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  type={type === 'CORPORATE' ? 'submit' : 'button'}
                  onClick={() => {
                    if (!name.trim()) return setFormError(t('customers.validationNameRequired'));
                    if (!nationalId.trim()) return setFormError(t('customers.validationIdRequired'));
                    if (!email.trim()) return setFormError(t('customers.validationEmailRequired', 'Email is required'));
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email.trim())) return setFormError(t('customers.validationEmailInvalid', 'Invalid email format'));
                    setFormError(null);
                    if (type === 'CORPORATE') return;
                    setFormStep(2);
                  }}
                >
                  {type === 'CORPORATE' ? t('common.save') : t('common.next', 'Continue')}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Driver's license credentials & photo */}
          {formStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('customers.licenseNumber')}>
                  <Input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder={t('customers.placeholderLicense')}
                    className="!h-9 rounded-lg"
                  />
                </FormField>
                <FormField label={t('customers.licenseCountry')}>
                  <Input
                    value={licenseCountry}
                    onChange={(e) => setLicenseCountry(e.target.value)}
                    placeholder={t('customers.placeholderCountry')}
                    className="!h-9 rounded-lg"
                  />
                </FormField>
              </div>

              <FormField label={t('customers.licenseExpDate')}>
                <Input
                  type="date"
                  value={licenseExpDate}
                  onChange={(e) => setLicenseExpDate(e.target.value)}
                  className="!h-9 rounded-lg"
                />
              </FormField>

              <div className="pt-1">
                <LicensePhotoCapture
                  value={licensePhotoUrl}
                  onChange={setLicensePhotoUrl}
                  onFileSelect={setPendingLicenseFile}
                  label={t('customers.licensePhoto', "Driver's License Photo")}
                />
              </div>

              {formError && (
                <p className="text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-border-surface/15">
                <Button variant="secondary" onClick={() => setFormStep(1)} type="button">
                  {t('common.back', 'Back')}
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={createMutation.isPending || updateMutation.isPending || isUploadingPhoto}
                >
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
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

export default CustomersPage;
