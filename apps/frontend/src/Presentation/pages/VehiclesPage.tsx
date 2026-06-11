import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnDef } from '@tanstack/react-table';
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
  usePassInspection,
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
import { ToggleSwitch } from '../components/ui/ToggleSwitch.js';
import { Toast } from '../components/ui/Toast.js';
import { FileUploader } from '../components/ui/FileUploader.js';
import { useUploadImage, getImageProxyUrl } from '../../Infrastructure/hooks/useUploads.js';
import { Plus, Pencil, ClipboardCheck, Sparkles } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';

export const VehiclesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const canClean = user?.role === 'INSPECTOR' || user?.role === 'ADMINISTRATOR';

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [cleaningStatus, setCleaningStatus] = useState('');
  const [filterVehicleTypeId, setFilterVehicleTypeId] = useState('');
  const [filterBrandId, setFilterBrandId] = useState('');
  const [filterModelId, setFilterModelId] = useState('');
  const [filterFuelTypeId, setFilterFuelTypeId] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Query hook
  const { data, isLoading } = useVehicles({ search, status, cleaningStatus, vehicleTypeId: filterVehicleTypeId, brandId: filterBrandId, modelId: filterModelId, fuelTypeId: filterFuelTypeId, page, limit });

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
  const passInspectionMutation = usePassInspection();
  const uploadMutation = useUploadImage();

  // Dialog/Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

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
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Reset form helper
  const resetForm = () => {
    setDescription('');
    setChassisNumber('');
    setEngineNumber('');
    setPlateNumber('');
    setVehicleTypeId(typesData?.items?.[0]?.id || '');
    const firstBrandId = brandsData?.items?.[0]?.id || '';
    setBrandId(firstBrandId);
    const firstBrandModels = (modelsData?.items || []).filter((m: any) => m.brandId === firstBrandId);
    setModelId(firstBrandModels[0]?.id || '');
    setFuelTypeId(fuelTypesData?.items?.[0]?.id || '');
    setOdometer(0);
    setImageUrl('');
    setPendingImageFile(null);
    setIsUploadingPhoto(false);
    setFormError(null);
  };

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

    try {
      if (editingItem) {
        let finalImageUrl = imageUrl;
        if (pendingImageFile) {
          setIsUploadingPhoto(true);
          setFormError(t('vehicles.uploadingPhoto', 'Uploading photo...'));
          const uploadResult = await uploadMutation.mutateAsync({
            file: pendingImageFile,
            folder: 'vehicles',
            entityType: 'vehicle',
            entityId: editingItem.id,
          });
          finalImageUrl = uploadResult.url;
          setPendingImageFile(null);
          setIsUploadingPhoto(false);
        }

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
          imageUrl: finalImageUrl.startsWith('blob:') ? undefined : (finalImageUrl.trim() || undefined),
        };

        await updateMutation.mutateAsync({
          id: editingItem.id,
          data: payload,
        });
        setToast({ message: t('vehicles.updatedSuccess'), type: 'success' });
      } else {
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
          imageUrl: imageUrl.startsWith('blob:') ? undefined : (imageUrl.trim() || undefined),
        };

        const created = await createMutation.mutateAsync({
          data: payload,
        });

        if (pendingImageFile) {
          setIsUploadingPhoto(true);
          setFormError(t('vehicles.uploadingPhoto', 'Uploading photo...'));
          const uploadResult = await uploadMutation.mutateAsync({
            file: pendingImageFile,
            folder: 'vehicles',
            entityType: 'vehicle',
            entityId: created.id,
          });
          setPendingImageFile(null);
          setIsUploadingPhoto(false);

          await updateMutation.mutateAsync({
            id: created.id,
            data: { imageUrl: uploadResult.url },
          });
        }
        setToast({ message: t('vehicles.createdSuccess'), type: 'success' });
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setIsUploadingPhoto(false);
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

  const handlePassInspection = async (item: any) => {
    try {
      await passInspectionMutation.mutateAsync({ id: item.id });
      setToast({ message: t('vehicles.inspectionPassed'), type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || t('common.operationFailed'), type: 'error' });
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
              <img src={getImageProxyUrl(item.imageUrl)} alt={item.plateNumber} className="w-12 h-8 rounded-lg object-cover border border-surface-border" />
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
          <div className="flex items-center gap-3">
            {isAdmin && (item.status === 'AVAILABLE' || item.status === 'RETIRED') && (
              <>
                <ToggleSwitch
                  checked={item.status === 'AVAILABLE'}
                  onChange={() => setConfirmState({
                    title: t('common.confirm'),
                    message: t('vehicles.retireActivateConfirmMsg', { action: t(item.status === 'AVAILABLE' ? 'common.deactivate' : 'common.activate'), plate: item.plateNumber }),
                    onConfirm: () => handleToggle(item),
                  })}
                  loading={toggleStatusMutation.isPending}
                />
                <button onClick={() => handleOpenEdit(item)} title={t('common.edit')} className="text-accent-primary hover:text-accent-primary/80 transition-colors">
                  <Pencil size={14} />
                </button>
              </>
            )}
            {canClean && (item.status === 'UNDER_INSPECTION' || item.status === 'MAINTENANCE') && (
              <button onClick={() => setConfirmState({
                title: t('common.confirm'),
                message: t('vehicles.passInspectionConfirmMsg', { plate: item.plateNumber }),
                onConfirm: () => handlePassInspection(item),
              })} title={t('vehicles.passInspection')} className="text-accent-primary hover:text-accent-primary/80 transition-colors">
                <ClipboardCheck size={14} />
              </button>
            )}
            {canClean && (
              <button onClick={() => setConfirmState({
                title: t('common.confirm'),
                message: t('vehicles.cleaningConfirmMsg', { action: t(item.cleaningStatus === 'CLEAN' ? 'vehicles.markDirty' : 'vehicles.markClean'), plate: item.plateNumber }),
                onConfirm: () => handleToggleCleaning(item),
              })} title={item.cleaningStatus === 'CLEAN' ? t('vehicles.markDirty') : t('vehicles.markClean')} className="text-accent-primary hover:text-accent-primary/80 transition-colors">
                <Sparkles size={14} />
              </button>
            )}
          </div>
        );
      },
    });
  }

  const typeOptions = (typesData?.items || []).map((t: any) => ({ value: t.id, label: t.name }));
  const brandOptions = (brandsData?.items || []).map((b: any) => ({ value: b.id, label: b.name }));
  const filteredModels = (modelsData?.items || []).filter((m: any) => m.brandId === brandId);
  const modelOptions = filteredModels.map((m: any) => ({ value: m.id, label: m.name }));
  const fuelTypeOptions = (fuelTypesData?.items || []).map((f: any) => ({ value: f.id, label: f.name }));

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('vehicles.title')}
        description={t('vehicles.subtitle')}
      >
        {isAdmin && (
          <Button variant="primary" size="sm" onClick={handleOpenCreate} className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs">
            <Plus size={13} />
            <span>{t('common.create')}</span>
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-col md:flex-row items-center gap-4 justify-between flex-wrap">
        <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} />
        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); setFilterModelId(''); }} className="w-full md:w-32 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary">
            <option value="">{t('common.allStatuses')}</option>
            <option value="AVAILABLE">{t('vehicles.available')}</option>
            <option value="RENTED">{t('vehicles.rented')}</option>
            <option value="UNDER_INSPECTION">{t('vehicles.underInspection')}</option>
            <option value="MAINTENANCE">{t('vehicles.maintenance')}</option>
            <option value="RETIRED">{t('vehicles.retired')}</option>
          </select>
          <select value={cleaningStatus} onChange={(e) => { setCleaningStatus(e.target.value); setPage(1); }} className="w-full md:w-32 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary">
            <option value="">{t('common.allCleaningStatuses')}</option>
            <option value="CLEAN">{t('vehicles.clean')}</option>
            <option value="DIRTY">{t('vehicles.dirty')}</option>
          </select>
          <select value={filterVehicleTypeId} onChange={(e) => { setFilterVehicleTypeId(e.target.value); setPage(1); }} className="w-full md:w-32 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary">
            <option value="">{t('common.allVehicleTypes')}</option>
            {(typesData?.items || []).map((t: any) => (<option key={t.id} value={t.id}>{t.name}</option>))}
          </select>
          <select value={filterBrandId} onChange={(e) => { setFilterBrandId(e.target.value); setPage(1); setFilterModelId(''); }} className="w-full md:w-32 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary">
            <option value="">{t('common.allBrands')}</option>
            {(brandsData?.items || []).map((b: any) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
          <select value={filterModelId} onChange={(e) => { setFilterModelId(e.target.value); setPage(1); }} className="w-full md:w-32 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary">
            <option value="">{t('common.allModels')}</option>
            {(modelsData?.items || []).filter((m: any) => !filterBrandId || m.brandId === filterBrandId).map((m: any) => (<option key={m.id} value={m.id}>{m.name}</option>))}
          </select>
          <select value={filterFuelTypeId} onChange={(e) => { setFilterFuelTypeId(e.target.value); setPage(1); }} className="w-full md:w-32 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary">
            <option value="">{t('common.allFuelTypes')}</option>
            {(fuelTypesData?.items || []).map((f: any) => (<option key={f.id} value={f.id}>{f.name}</option>))}
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
              onChange={(e) => {
                setBrandId(e.target.value);
                const brandModels = (modelsData?.items || []).filter((m: any) => m.brandId === e.target.value);
                setModelId(brandModels[0]?.id || '');
              }}
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

          <FileUploader
            value={imageUrl}
            onChange={setImageUrl}
            onFileSelect={setPendingImageFile}
            label={t('vehicles.imageUrl')}
            accept="image/*"
            showCamera
          />

          <FormField label={t('vehicles.description')}>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Red SUV with sunroof"
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
            <Button variant="primary" type="submit" isLoading={createMutation.isPending || updateMutation.isPending || isUploadingPhoto}>
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
          isLoading={toggleStatusMutation.isPending || updateCleaningMutation.isPending || passInspectionMutation.isPending}
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

export default VehiclesPage;
