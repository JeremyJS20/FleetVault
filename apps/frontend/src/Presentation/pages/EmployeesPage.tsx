import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';

import { useAuth } from '../../Infrastructure/auth.context.js';
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useToggleEmployeeStatus,
} from '../../Infrastructure/hooks/useCatalog.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { SearchBar } from '../components/ui/SearchBar.js';
import { DataTable } from '../components/ui/DataTable.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { FormModal } from '../components/ui/FormModal.js';
import { NationalIdInput } from '../components/ui/NationalIdInput.js';
import { FormField } from '../components/ui/FormField.js';
import { Input } from '../components/ui/Input.js';
import { SelectField } from '../components/ui/SelectField.js';
import { ToggleSwitch } from '../components/ui/ToggleSwitch.js';
import { Toast } from '../components/ui/Toast.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { Plus, Pencil } from 'lucide-react';

export const EmployeesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'ADMINISTRATOR';

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query hook
  const { data, isLoading } = useEmployees({ search, status, shift: shiftFilter, page, limit });

  // Mutations
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const toggleStatusMutation = useToggleEmployeeStatus();
  // Dialog/Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);


  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState(0);
  const [hireDate, setHireDate] = useState('');
  const [shift, setShift] = useState('MORNING');
  const [role, setRole] = useState('AGENT');

  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setNationalId('');
    setPhone('');
    setCommissionPercentage(0);
    setHireDate(new Date().toISOString().split('T')[0]);
    setShift('MORNING');
    setRole('AGENT');
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setName(item.name);
    setEmail(item.email || '');
    setNationalId(item.nationalId);
    setPhone(item.phone || '');
    setCommissionPercentage(item.commissionPercentage);
    setHireDate(item.hireDate ? item.hireDate.split('T')[0] : '');
    setShift(item.shift);
    setRole(item.role || 'AGENT');
    setEditingItem(item);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setFormError(t('employees.validationNameRequired'));
    if (!email.trim()) return setFormError(t('employees.validationEmailRequired'));
    if (!nationalId.trim()) return setFormError(t('employees.validationIdRequired'));
    if (commissionPercentage < 0 || commissionPercentage > 100) {
      return setFormError(t('employees.validationCommissionRange'));
    }

    const payload = {
      name,
      email,
      nationalId,
      phone: phone.trim() || undefined,
      commissionPercentage: Number(commissionPercentage),
      hireDate: hireDate ? new Date(hireDate).toISOString() : new Date().toISOString(),
      shift,
      role,
    };

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        setToast({ message: t('employees.updatedSuccess'), type: 'success' });
      } else {
        await createMutation.mutateAsync({
          data: payload,
        });
        setToast({ message: t('employees.createdSuccess'), type: 'success' });
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
      header: t('employees.name'),
      cell: (info) => <span className="font-bold text-fg-main">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'nationalId',
      header: t('employees.nationalId'),
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
    },
    {
      accessorKey: 'shift',
      header: t('employees.shift'),
      cell: (info) => <span className="font-semibold text-xs text-fg-secondary">{t(`employees.${(info.getValue() as string).toLowerCase()}`)}</span>,
    },
    {
      accessorKey: 'commissionPercentage',
      header: t('employees.commissionPercentage'),
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as number}%</span>,
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
                title: t('common.confirm'),
                message: t('common.toggleStatusConfirm', { action: t(item.status === 'ACTIVE' ? 'common.deactivate' : 'common.activate'), name: item.name }),
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
        title={t('employees.title')}
        description={t('employees.subtitle')}
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
        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={shiftFilter}
            onChange={(e) => { setShiftFilter(e.target.value); setPage(1); }}
            className="w-full md:w-40 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
          >
            <option value="">{t('common.allShifts')}</option>
            <option value="MORNING">{t('employees.morning')}</option>
            <option value="AFTERNOON">{t('employees.afternoon')}</option>
            <option value="NIGHT">{t('employees.night')}</option>
          </select>
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
        title={editingItem ? t('employees.editTitle') : t('employees.createTitle')}
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
          <FormField label={t('employees.name')} required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </FormField>

          <FormField label={t('employees.email')} required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@company.com"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <NationalIdInput
              value={nationalId}
              onChange={setNationalId}
              type="INDIVIDUAL"
              required
            />
            <SelectField
              label={t('employees.role')}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'AGENT', label: t('employees.agent') },
                { value: 'INSPECTOR', label: t('employees.inspector') },
                { value: 'ADMINISTRATOR', label: t('employees.administrator') },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('employees.phone', 'Phone')}>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('employees.placeholderPhone', '(809) 555-1234')}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label={t('employees.shift')}
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              options={[
                { value: 'MORNING', label: t('employees.morning') },
                { value: 'AFTERNOON', label: t('employees.afternoon') },
                { value: 'NIGHT', label: t('employees.night') },
              ]}
            />
            <FormField label={t('employees.commissionPercentage')} required>
              <Input
                type="number"
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                placeholder="Commission % e.g. 5"
              />
            </FormField>
          </div>

          <FormField label={t('employees.hireDate')} required>
            <Input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
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

export default EmployeesPage;
