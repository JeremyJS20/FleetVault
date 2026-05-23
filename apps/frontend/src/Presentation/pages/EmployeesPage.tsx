import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Power } from 'lucide-react';
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
import { FormField } from '../components/ui/FormField.js';
import { Input } from '../components/ui/Input.js';
import { SelectField } from '../components/ui/SelectField.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { Toast } from '../components/ui/Toast.js';

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState(0);
  const [hireDate, setHireDate] = useState('');
  const [shift, setShift] = useState('MORNING');
  const [userId, setUserId] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const resetForm = () => {
    setName('');
    setNationalId('');
    setCommissionPercentage(0);
    setHireDate(new Date().toISOString().split('T')[0]);
    setShift('MORNING');
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
    setCommissionPercentage(item.commissionPercentage);
    setHireDate(item.hireDate ? item.hireDate.split('T')[0] : '');
    setShift(item.shift);
    setUserId(item.userId || '');
    setEditingItem(item);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setFormError(t('employees.validationNameRequired'));
    if (!nationalId.trim()) return setFormError(t('employees.validationIdRequired'));
    if (commissionPercentage < 0 || commissionPercentage > 100) {
      return setFormError(t('employees.validationCommissionRange'));
    }

    const payload = {
      name,
      nationalId,
      commissionPercentage: Number(commissionPercentage),
      hireDate: hireDate ? new Date(hireDate).toISOString() : new Date().toISOString(),
      shift,
      userId: userId.trim() || undefined,
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
        title={t('employees.title')}
        description={t('employees.subtitle')}
      >
        {isAdmin && (
          <Button variant="primary" onClick={handleOpenCreate}>
            {t('common.create')}
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

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('employees.nationalId')} required>
              <Input
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="National Cedula/ID number"
              />
            </FormField>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('employees.commissionPercentage')} required>
              <Input
                type="number"
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                placeholder="Commission % e.g. 5"
              />
            </FormField>
            <FormField label={t('employees.hireDate')} required>
              <Input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
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

      {/* Confirm Status Change Modal */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmToggle}
        title={t('common.confirmStatusChange', { entity: 'Employee' })}
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

export default EmployeesPage;
