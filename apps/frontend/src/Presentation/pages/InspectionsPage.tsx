import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInspectionsList, useCreateInspection } from '../../Infrastructure/hooks/useInspections.js';
import { useVehicles } from '../../Infrastructure/hooks/useCatalog.js';
import { useCustomers } from '../../Infrastructure/hooks/useCatalog.js';
import { useUploadImage } from '../../Infrastructure/hooks/useUploads.js';
import { useNetworkStatus } from '../../Infrastructure/network-status.js';
import { queueOfflineInspection } from '../../Infrastructure/offline-queue.js';
import { FormModal } from '../components/ui/FormModal.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { AlertCircle, Camera, Check, CheckCircle2, ClipboardCheck, AlertTriangle } from 'lucide-react';

export const InspectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isOnline, triggerQueueRefresh } = useNetworkStatus();

  // Dialog & Lists States
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [vehicleId, setVehicleId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [odometer, setOdometer] = useState(0);
  const [fuelGaugeLevel, setFuelGaugeLevel] = useState('FULL');
  const [fuelGaugePhotoUrl, setFuelGaugePhotoUrl] = useState('');
  const [hasScratches, setHasScratches] = useState(false);
  const [hasBrokenGlass, setHasBrokenGlass] = useState(false);
  const [hasSpareTire, setHasSpareTire] = useState(true);
  const [hasJack, setHasJack] = useState(true);
  const [tireConditionFrontLeft, setTireConditionFrontLeft] = useState('GOOD');
  const [tireConditionFrontRight, setTireConditionFrontRight] = useState('GOOD');
  const [tireConditionRearLeft, setTireConditionRearLeft] = useState('GOOD');
  const [tireConditionRearRight, setTireConditionRearRight] = useState('GOOD');
  const [comments, setComments] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // Photo uploading states
  const [isUploadingFuel, setIsUploadingFuel] = useState(false);

  // Queries
  const { data: inspectionsData, isLoading: isInspectionsLoading, refetch } = useInspectionsList({ page: 1, limit: 10 });
  const inspections = inspectionsData?.items || [];

  const { data: vehiclesData } = useVehicles({});
  const { data: customersData } = useCustomers({});
  const vehicles = vehiclesData?.items || [];
  const customers = customersData?.items || [];

  // Mutations
  const createInspectionMutation = useCreateInspection();
  const uploadImageMutation = useUploadImage();

  const handleFuelPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingFuel(true);
      setErrorMsg(null);

      if (!isOnline) {
        // If offline, store image locally as a base64 Data URL temporarily
        const reader = new FileReader();
        reader.onloadend = () => {
          setFuelGaugePhotoUrl(reader.result as string);
          setIsUploadingFuel(false);
        };
        reader.readAsDataURL(file);
      } else {
        const uploadResult = await uploadImageMutation.mutateAsync(file);
        setFuelGaugePhotoUrl(uploadResult.url);
        setIsUploadingFuel(false);
      }
    } catch (err: any) {
      setErrorMsg(t('common.operationFailed'));
      setFuelGaugePhotoUrl('https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&q=80&w=200');
      setIsUploadingFuel(false);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !customerId || !fuelGaugePhotoUrl) {
      setErrorMsg(t('common.operationFailed'));
      return;
    }

    const selectedVehicle = vehicles.find((v: any) => v.id === vehicleId);
    if (selectedVehicle && odometer < selectedVehicle.odometer) {
      setErrorMsg(t('common.operationFailed'));
      return;
    }

    const payload = {
      vehicleId,
      customerId,
      hasScratches,
      fuelGaugeLevel,
      fuelGaugePhotoUrl,
      hasSpareTire,
      hasJack,
      hasBrokenGlass,
      tireConditionFrontLeft,
      tireConditionFrontRight,
      tireConditionRearLeft,
      tireConditionRearRight,
      odometer,
      photoUrls,
      comments: comments || null
    };

    try {
      setErrorMsg(null);
      if (!isOnline) {
        // Queue Offline
        await queueOfflineInspection(payload);
        await triggerQueueRefresh();
        setSuccessMsg(t('common.statusUpdated'));
        setTimeout(() => { setSuccessMsg(null); setIsOpen(false); resetForm(); }, 3500);
      } else {
        // Upload Online
        await createInspectionMutation.mutateAsync(payload);
        setSuccessMsg(t('common.statusUpdated'));
        setTimeout(() => { setSuccessMsg(null); setIsOpen(false); resetForm(); }, 2000);
        refetch();
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('common.operationFailed'));
    }
  };

  const resetForm = () => {
    setVehicleId('');
    setCustomerId('');
    setOdometer(0);
    setFuelGaugeLevel('FULL');
    setFuelGaugePhotoUrl('');
    setHasScratches(false);
    setHasBrokenGlass(false);
    setHasSpareTire(true);
    setHasJack(true);
    setTireConditionFrontLeft('GOOD');
    setTireConditionFrontRight('GOOD');
    setTireConditionRearLeft('GOOD');
    setTireConditionRearRight('GOOD');
    setComments('');
    setPhotoUrls([]);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-fg-main uppercase">
            {t('inspections.title')}
          </h2>
          <p className="text-xs text-fg-secondary mt-1">
            {t('inspections.subtitle')}
          </p>
        </div>

        <Button onClick={() => setIsOpen(true)} className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          {t('inspections.logNewInspection')}
        </Button>
      </div>

      {/* Inspections Listings */}
      {isInspectionsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
          <span className="text-xs text-fg-tertiary font-bold tracking-wider">{t('inspections.loading')}</span>
        </div>
      ) : inspections.length === 0 ? (
        <div className="text-center py-20 p-6 rounded-2xl border border-dashed border-border-surface/40 bg-bg-surface/10">
          <p className="text-sm font-bold text-fg-secondary">{t('inspections.noData')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {inspections.map((insp: any) => (
            <div key={insp.id} className="p-5 rounded-2xl border border-border-surface/30 bg-bg-card/45 backdrop-blur-md space-y-4 hover:border-border-surface transition-all">
              
              <div className="flex justify-between items-start border-b border-border-surface/10 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-fg-tertiary uppercase font-mono">#{insp.id.substring(0, 8)}</h3>
                  <h2 className="text-sm font-extrabold text-fg-main uppercase mt-0.5">
                    {insp.vehicle.brand.name} {insp.vehicle.model.name}
                  </h2>
                </div>
                <StatusBadge status={insp.status === 'FLAGGED' ? 'MAINTENANCE' : 'ACTIVE'} />
              </div>

              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-semibold text-fg-secondary">
                <div>
                  <span className="text-fg-tertiary block text-[9px] uppercase tracking-wider">{t('inspections.odometerReading')}</span>
                  <span className="text-fg-main">{insp.odometer} km</span>
                </div>
                <div>
                  <span className="text-fg-tertiary block text-[9px] uppercase tracking-wider">{t('inspections.fuelLevel')}</span>
                  <span className="text-fg-main uppercase">{insp.fuelGaugeLevel}</span>
                </div>
                <div>
                  <span className="text-fg-tertiary block text-[9px] uppercase tracking-wider">{t('inspections.customerVerified')}</span>
                  <span className="text-fg-main truncate block max-w-[120px]">{insp.customer.name}</span>
                </div>
                <div>
                  <span className="text-fg-tertiary block text-[9px] uppercase tracking-wider">{t('inspections.inspectionDate')}</span>
                  <span className="text-fg-main">{new Date(insp.inspectionDate).toLocaleDateString()}</span>
                </div>
              </div>

              {insp.comments && (
                <div className="p-2.5 rounded-lg bg-bg-inset border border-border-surface/20 text-xs text-fg-secondary">
                  <strong>{t('inspections.notes')}</strong> {insp.comments}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE INSPECTION DIALOG OVERLAY */}
      {isOpen && (
        <FormModal isOpen={isOpen} onClose={() => { setIsOpen(false); resetForm(); }} title={t('inspections.logInspectionTitle')}>

            {!isOnline && (
              <div className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 text-xs text-fg-secondary flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-500 block uppercase mb-0.5">{t('inspections.offlineDetected')}</strong>
                  {t('inspections.offlineDesc')}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('inspections.assignedVehicle')} required>
                  <select
                    value={vehicleId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setVehicleId(e.target.value);
                      const selected = vehicles.find((v: any) => v.id === e.target.value);
                      if (selected) setOdometer(selected.odometer);
                    }}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                    required
                  >
                    <option value="">{t('inspections.chooseVehicle')}</option>
                    {vehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.brand.name} {v.model.name} ({v.plateNumber})</option>
                    ))}
                  </select>
                </FormField>

                <FormField label={t('inspections.associatedCustomer')} required>
                  <select
                    value={customerId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCustomerId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                    required
                  >
                    <option value="">{t('inspections.chooseCustomer')}</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('inspections.odometerReadingKm')} required>
                  <Input
                    type="number"
                    value={odometer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOdometer(Number(e.target.value))}
                    className="!h-9 rounded-lg"
                    required
                  />
                </FormField>

                <FormField label={t('inspections.fuelGaugeLevel')} required>
                  <select
                    value={fuelGaugeLevel}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFuelGaugeLevel(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                  >
                    <option value="FULL">{t('common.fuelFull')}</option>
                    <option value="THREE_QUARTERS">{t('common.fuelThreeQuarters')}</option>
                    <option value="HALF">{t('common.fuelHalf')}</option>
                    <option value="QUARTER">{t('common.fuelQuarter')}</option>
                    <option value="EMPTY">{t('common.fuelEmpty')}</option>
                  </select>
                </FormField>
              </div>

              {/* Fuel photo camera attachment */}
              <div className="border border-border-surface/30 p-3 rounded-xl bg-bg-surface/10 space-y-2">
                <span className="text-xs font-bold text-accent-primary uppercase tracking-widest block">{t('inspections.fuelGaugeAttachment')}</span>
                
                <div className="flex items-center gap-3">
                  <label className="h-9 px-4 rounded-lg bg-bg-inset border border-border-surface/40 flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold hover:bg-bg-surface text-fg-secondary">
                    <Camera className="w-4 h-4 text-accent-primary" />
                    {t('inspections.takePhoto')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFuelPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {isUploadingFuel ? (
                    <span className="text-xs font-bold text-accent-primary animate-pulse uppercase">{t('inspections.processingImage')}</span>
                  ) : fuelGaugePhotoUrl ? (
                    <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {t('inspections.photoAttached')}
                    </span>
                  ) : (
                    <span className="text-xs text-accent-error font-bold uppercase leading-none">{t('inspections.photoRequired')}</span>
                  )}
                </div>
              </div>

              {/* INTERACTIVE CAR DAMAGE OVERLAY */}
              <div className="p-4 rounded-xl border border-border-surface/30 space-y-3 bg-bg-surface/10">
                <span className="text-xs font-bold text-accent-primary uppercase tracking-widest block">{t('inspections.damageChecklist')}</span>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasScratches}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHasScratches(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                    />
                    {t('inspections.bodyScratches')}
                  </label>

                  <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasBrokenGlass}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHasBrokenGlass(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                    />
                    {t('inspections.brokenGlass')}
                  </label>

                  <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSpareTire}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHasSpareTire(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                    />
                    {t('inspections.hasSpareTire')}
                  </label>

                  <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasJack}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHasJack(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                    />
                    {t('inspections.hasToolJack')}
                  </label>
                </div>

                <div className="border-t border-border-surface/10 pt-3 grid grid-cols-2 gap-4">
                  <FormField label={t('inspections.tireFLCondition')}>
                    <select
                      value={tireConditionFrontLeft}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTireConditionFrontLeft(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-bold px-2 text-fg-secondary outline-none"
                    >
                      <option value="GOOD">{t('common.tireGood')}</option>
                      <option value="WORN">{t('common.tireWorn')}</option>
                      <option value="DAMAGED">{t('common.tireDamaged')}</option>
                      <option value="MISSING">{t('common.tireMissing')}</option>
                    </select>
                  </FormField>

                  <FormField label={t('inspections.tireFRCondition')}>
                    <select
                      value={tireConditionFrontRight}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTireConditionFrontRight(e.target.value)}
                      className="w-full h-8 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-bold px-2 text-fg-secondary outline-none"
                    >
                      <option value="GOOD">{t('common.tireGood')}</option>
                      <option value="WORN">{t('common.tireWorn')}</option>
                      <option value="DAMAGED">{t('common.tireDamaged')}</option>
                      <option value="MISSING">{t('common.tireMissing')}</option>
                    </select>
                  </FormField>
                </div>
              </div>

              <FormField label={t('inspections.comments')}>
                <textarea
                  value={comments}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
                  placeholder={t('inspections.commentsPlaceholder')}
                  className="w-full h-16 p-3 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold text-fg-secondary outline-none focus:border-accent-primary resize-none"
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-surface/15">
                <Button type="button" variant="secondary" onClick={() => { setIsOpen(false); resetForm(); }}>{t('inspections.cancel')}</Button>
                <Button type="submit" isLoading={createInspectionMutation.isPending}>
                  {t('inspections.submitAudit')}
                </Button>
              </div>

            </form>
        </FormModal>
      )}

    </div>
  );
};
export default InspectionsPage;
