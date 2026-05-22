import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
import { Pencil, Power, Sparkles } from 'lucide-react';
import { useAuth } from '../../Infrastructure/auth.context.js';
import {
  useVehicles,
  useVehicleTypes,
  useBrands,
  useModels,
  useFuelTypes,
  useCreateVehicle,
  useUpdateVehicle,
  useToggleVehicleStatus,
  useUpdateVehicleCleaning,
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

export const VehiclesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const canClean = user?.role === 'INSPECTOR' || user?.role === 'ADMINISTRATOR';

  // Filters state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query hook
  const { data, isLoading } = useVehicles({ search, page, limit });

  // Lookups data (fetch ACTIVE status items only, large limits)
  const { data: typesData } = useVehicleTypes({ status: 'ACTIVE', limit: 100 });
  const { data: brandsData } = useBrands({ status: 'ACTIVE', limit: 100 });
  const { data: modelsData } = useModels({ status: 'ACTIVE', limit: 200 });
  const { data: fuelTypesData } = useFuelTypes({ status: 'ACTIVE', limit: 100 });

  // Mutations
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const toggleStatusMutation = useToggleVehicleStatus();
  const updateCleaningMutation = useUpdateVehicleCleaning();

  // Dialog/Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<any>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [fuelTypeId, setFuelTypeId] = useState('');
  const [odometer, setOdometer] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [cleaningStatus, setCleaningStatus] = useState('CLEAN');

  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Reset form helper
  const resetForm = () => {
    setDescription('');
    setChassisNumber('');
    setEngineNumber('');
    setPlateNumber('');
    setVehicleTypeId(typesData?.items?.[0]?.id || '');
    setBrandId(brandsData?.items?.[0]?.id || '');
    setModelId('');
    setFuelTypeId(fuelTypesData?.items?.[0]?.id || '');
    setOdometer(0);
    setImageUrl('');
    setStatus('AVAILABLE');
    setCleaningStatus('CLEAN');
    setFormError(null);
  };

  // Watch brand changes to filter model list & reset selected model
  const filteredModels = (modelsData?.items || []).filter((m: any) => m.brandId === brandId);

  useEffect(() => {
    if (!editingItem && filteredModels.length > 0) {
      // Auto-select first matching model
      setModelId(filteredModels[0].id);
    }
  }, [brandId, modelsData]);

  const handleOpenCreate = () => {
    resetForm();
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setDescription(item.description || '');
    setChassisNumber(item.chassisNumber);
    setEngineNumber(item.engineNumber);
    setPlateNumber(item.plateNumber);
    setVehicleTypeId(item.vehicleTypeId);
    setBrandId(item.brandId);
    setModelId(item.modelId);
    setFuelTypeId(item.fuelTypeId);
    setOdometer(item.odometer);
    setImageUrl(item.imageUrl || '');
    setStatus(item.status);
    setCleaningStatus(item.cleaningStatus);
    setEditingItem(item);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chassisNumber.trim()) return setFormError(t('vehicles.validationChassisRequired'));
    if (!engineNumber.trim()) return setFormError(t('vehicles.validationEngineRequired'));
    if (!plateNumber.trim()) return setFormError(t('vehicles.validationPlateRequired'));
    if (!vehicleTypeId) return setFormError(t('vehicles.validationTypeRequired'));
    if (!brandId) return setFormError(t('vehicles.validationBrandRequired'));
    if (!modelId) return setFormError(t('vehicles.validationModelRequired'));
    if (!fuelTypeId) return setFormError(t('vehicles.validationFuelRequired'));

    const payload = {
      description,
      chassisNumber,
      engineNumber,
      plateNumber,
      vehicleTypeId,
      brandId,
      modelId,
      fuelTypeId,
      odometer: Number(odometer),
      imageUrl: imageUrl.trim() || undefined,
      status: editingItem ? status : undefined,
      cleaningStatus: editingItem ? cleaningStatus : undefined,
    };

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        setToast({ message: t('vehicles.updatedSuccess'), type: 'success' });
      } else {
        await createMutation.mutateAsync({
          data: payload,
        });
        setToast({ message: t('vehicles.createdSuccess'), type: 'success' });
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

  const handleToggleCleaning = async (item: any) => {
    const nextCleaning = item.cleaningStatus === 'CLEAN' ? 'DIRTY' : 'CLEAN';
    try {
      await updateCleaningMutation.mutateAsync({
        id: item.id,
        data: { cleaningStatus: nextCleaning },
      });
      setToast({ message: t('common.cleaningUpdated'), type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || t('common.cleaningUpdateFailed'), type: 'error' });
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'vehicle',
      header: t('nav.vehicles'),
      cell: (info) => {
        const item = info.row.original;
        return (
          <div className="flex items-center gap-3">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.plateNumber} className="w-12 h-8 rounded-lg object-cover border border-surface-border" />
            ) : (
              <div className="w-12 h-8 rounded-lg bg-surface-inset flex items-center justify-center text-xs font-bold text-fg-tertiary">
                {t('vehicles.noPic')}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-fg-main">
                {item.brand?.name} {item.model?.name}
              </span>
              <span className="text-xs text-fg-secondary font-bold font-mono">
                {item.plateNumber}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'vehicleType.name',
      header: t('vehicles.vehicleType'),
    },
    {
      accessorKey: 'odometer',
      header: t('vehicles.odometer'),
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as number} km</span>,
    },
    {
      accessorKey: 'cleaningStatus',
      header: t('vehicles.cleaningStatus'),
      cell: (info) => <StatusBadge status={info.getValue() as string} />,
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      cell: (info) => <StatusBadge status={info.getValue() as string} />,
    },
  ];

  if (isAdmin || canClean) {
    columns.push({
      id: 'actions',
      header: t('common.actions'),
      cell: (info) => {
        const item = info.row.original;
        return (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
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
                  variant={item.status === 'AVAILABLE' ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => handleOpenToggle(item)}
                  title={t('common.toggleStatus')}
                  className="!p-2.5 rounded-xl"
                >
                  <Power size={15} />
                </Button>
              </>
            )}
            {canClean && (
              <Button
                variant="secondary"
                size="sm"
                className="!text-teal-500 hover:!bg-teal-500/10 !p-2.5 rounded-xl"
                onClick={() => handleToggleCleaning(item)}
                title={item.cleaningStatus === 'CLEAN' ? t('vehicles.markDirty') : t('vehicles.markClean')}
              >
                <Sparkles size={15} />
              </Button>
            )}
          </div>
        );
      },
    });
  }

  const typeOptions = (typesData?.items || []).map((t: any) => ({ value: t.id, label: t.name }));
  const brandOptions = (brandsData?.items || []).map((b: any) => ({ value: b.id, label: b.name }));
  const modelOptions = filteredModels.map((m: any) => ({ value: m.id, label: m.name }));
  const fuelTypeOptions = (fuelTypesData?.items || []).map((f: any) => ({ value: f.id, label: f.name }));

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('vehicles.title')}
        description={t('vehicles.subtitle')}
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
        title={editingItem ? t('vehicles.editTitle') : t('vehicles.createTitle')}
      >
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('vehicles.plateNumber')} required>
              <Input
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                placeholder={t('vehicles.placeholderPlate')}
              />
            </FormField>
            <FormField label={t('vehicles.odometer')} required>
              <Input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(Number(e.target.value))}
                placeholder={t('vehicles.placeholderOdo')}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('vehicles.chassisNumber')} required>
              <Input
                value={chassisNumber}
                onChange={(e) => setChassisNumber(e.target.value)}
                placeholder={t('vehicles.placeholderChassis')}
              />
            </FormField>
            <FormField label={t('vehicles.engineNumber')} required>
              <Input
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value)}
                placeholder={t('vehicles.placeholderEngine')}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label={t('vehicles.brand')}
              required
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              options={brandOptions}
            />
            <SelectField
              label={t('vehicles.model')}
              required
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              options={modelOptions}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label={t('vehicles.vehicleType')}
              required
              value={vehicleTypeId}
              onChange={(e) => setVehicleTypeId(e.target.value)}
              options={typeOptions}
            />
            <SelectField
              label={t('vehicles.fuelType')}
              required
              value={fuelTypeId}
              onChange={(e) => setFuelTypeId(e.target.value)}
              options={fuelTypeOptions}
            />
          </div>

          <FormField label={t('vehicles.imageUrl')}>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={t('vehicles.placeholderImage')}
            />
          </FormField>

          <FormField label={t('vehicles.description')}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Red SUV with sunroof"
            />
          </FormField>

          {editingItem && (
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label={t('vehicles.status')}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'AVAILABLE', label: t('vehicles.available') },
                  { value: 'RENTED', label: t('vehicles.rented') },
                  { value: 'UNDER_INSPECTION', label: t('vehicles.underInspection') },
                  { value: 'MAINTENANCE', label: t('vehicles.maintenance') },
                  { value: 'RETIRED', label: t('vehicles.retired') },
                ]}
              />
              <SelectField
                label={t('vehicles.cleaningStatus')}
                value={cleaningStatus}
                onChange={(e) => setCleaningStatus(e.target.value)}
                options={[
                  { value: 'CLEAN', label: t('vehicles.clean') },
                  { value: 'DIRTY', label: t('vehicles.dirty') },
                ]}
              />
            </div>
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
        title={t('vehicles.retireActivateTitle')}
        message={t('common.confirmStatusChangeMsg', { name: confirmItem?.plateNumber })}
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

export default VehiclesPage;
