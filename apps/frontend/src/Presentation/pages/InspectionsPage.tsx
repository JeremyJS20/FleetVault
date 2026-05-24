import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInspectionsList, useCreateInspection } from '../../Infrastructure/hooks/useInspections.js';
import { useRentalsList } from '../../Infrastructure/hooks/useRentals.js';
import { useUploadImage } from '../../Infrastructure/hooks/useUploads.js';
import { useNetworkStatus } from '../../Infrastructure/network-status.js';
import { queueOfflineInspection } from '../../Infrastructure/offline-queue.js';
import { SearchBar } from '../components/ui/SearchBar.js';
import { FormModal } from '../components/ui/FormModal.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { AlertCircle, Camera, CheckCircle2, ClipboardCheck, AlertTriangle, X } from 'lucide-react';
import { FileUploader } from '../components/ui/FileUploader.js';

export const InspectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isOnline, triggerQueueRefresh } = useNetworkStatus();

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Dialog & Lists States
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [type, setType] = useState<'PICKUP' | 'RETURN'>('PICKUP');
  const [rentalId, setRentalId] = useState('');
  const [selectedRental, setSelectedRental] = useState<any | null>(null);
  const [odometer, setOdometer] = useState(0);
  const [fuelGaugeLevel, setFuelGaugeLevel] = useState('FULL');
  const [hasScratches, setHasScratches] = useState(false);
  const [hasBrokenGlass, setHasBrokenGlass] = useState(false);
  const [missingSpareTire, setMissingSpareTire] = useState(false);
  const [missingJack, setMissingJack] = useState(false);
  const [tireConditionFrontLeft, setTireConditionFrontLeft] = useState('GOOD');
  const [tireConditionFrontRight, setTireConditionFrontRight] = useState('GOOD');
  const [tireConditionRearLeft, setTireConditionRearLeft] = useState('GOOD');
  const [tireConditionRearRight, setTireConditionRearRight] = useState('GOOD');
  const [comments, setComments] = useState('');
  interface VehiclePhotoSlot { value: string; file: File | null }
  const [vehiclePhotoSlots, setVehiclePhotoSlots] = useState<VehiclePhotoSlot[]>([]);

  const updateVehiclePhotoSlotValue = (index: number, value: string) => {
    setVehiclePhotoSlots(prev => prev.map((s, i) => i === index ? { ...s, value } : s));
  };
  const updateVehiclePhotoSlotFile = (index: number, file: File | null) => {
    setVehiclePhotoSlots(prev => prev.map((s, i) => i === index ? { ...s, file } : s));
  };
  const removeVehiclePhotoSlot = (index: number) => {
    const slot = vehiclePhotoSlots[index];
    if (slot?.value.startsWith('blob:')) URL.revokeObjectURL(slot.value);
    setVehiclePhotoSlots(prev => prev.filter((_, i) => i !== index));
  };
  const addVehiclePhotoSlot = () => {
    if (vehiclePhotoSlots.length >= 5) return;
    setVehiclePhotoSlots(prev => [...prev, { value: '', file: null }]);
  };

  // Queries
  const { data: inspectionsData, isLoading: isInspectionsLoading, refetch } = useInspectionsList({ search, type: filterType, status: filterStatus, page, limit });
  const inspections = inspectionsData?.items || [];

  const { data: pendingRentalsData } = useRentalsList({ status: 'PENDING' });
  const { data: activeRentalsData } = useRentalsList({ status: 'ACTIVE' });
  const rentals = type === 'PICKUP' ? (pendingRentalsData?.items || []) : (activeRentalsData?.items || []);

  // Mutations
  const createInspectionMutation = useCreateInspection();
  const uploadImageMutation = useUploadImage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentalId) {
      setErrorMsg(t('common.operationFailed'));
      return;
    }

    try {
      setErrorMsg(null);

      const uploadedPhotoUrls: string[] = [];
      for (const slot of vehiclePhotoSlots) {
        if (slot.file && isOnline) {
          const uploadResult = await uploadImageMutation.mutateAsync({ file: slot.file, folder: 'inspections', entityType: 'rental', entityId: rentalId });
          uploadedPhotoUrls.push(uploadResult.url);
        }
      }

      const payload = {
        rentalId,
        type,
        hasScratches,
        fuelGaugeLevel,
        missingSpareTire,
        missingJack,
        hasBrokenGlass,
        tireConditionFrontLeft,
        tireConditionFrontRight,
        tireConditionRearLeft,
        tireConditionRearRight,
        odometer,
        photoUrls: uploadedPhotoUrls,
        comments: comments || null
      };

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
    vehiclePhotoSlots.forEach(s => { if (s.value.startsWith('blob:')) URL.revokeObjectURL(s.value); });
    setVehiclePhotoSlots([]);
    setType('PICKUP');
    setRentalId('');
    setSelectedRental(null);
    setOdometer(0);
    setFuelGaugeLevel('FULL');

    setHasScratches(false);
    setHasBrokenGlass(false);
    setMissingSpareTire(false);
    setMissingJack(false);
    setTireConditionFrontLeft('GOOD');
    setTireConditionFrontRight('GOOD');
    setTireConditionRearLeft('GOOD');
    setTireConditionRearRight('GOOD');
    setComments('');
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <SearchBar value={search} onChange={(val) => { setSearch(val); setPage(1); }} />
        <div className="flex gap-2 w-full md:w-auto">
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} className="w-full md:w-40 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary">
            <option value="">{t('common.allTypes')}</option>
            <option value="PICKUP">{t('inspections.pickupInspection')}</option>
            <option value="RETURN">{t('inspections.returnInspection')}</option>
          </select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="w-full md:w-40 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary">
            <option value="">{t('common.allStatuses')}</option>
            <option value="PASSED">{t('inspections.passed')}</option>
            <option value="FLAGGED">{t('inspections.flagged')}</option>
          </select>
        </div>
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
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    insp.type === 'PICKUP'
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-purple-500/10 text-purple-500'
                  }`}>
                    {insp.type === 'PICKUP' ? t('inspections.pickupInspection') : t('inspections.returnInspection')}
                  </span>
                  <StatusBadge status={insp.status} />
                </div>
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
                  <span className="text-fg-tertiary block text-[9px] uppercase tracking-wider">{t('inspections.inspectedBy')}</span>
                  <span className="text-fg-main truncate block max-w-[120px]">{insp.employee?.name || '—'}</span>
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

      {/* Pagination */}
      {inspectionsData && inspectionsData.pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            {t('common.previous')}
          </Button>
          <span className="text-xs font-semibold text-fg-secondary">
            {t('common.pageOf', { current: page, total: inspectionsData.pages })}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= inspectionsData.pages} onClick={() => setPage(p => p + 1)}>
            {t('common.next')}
          </Button>
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

              {/* Type toggle */}
              <div className="flex gap-2 p-1 rounded-xl bg-bg-inset border border-border-surface/20">
                <button
                  type="button"
                  onClick={() => { setType('PICKUP'); setRentalId(''); setSelectedRental(null); }}
                  className={`flex-1 h-8 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    type === 'PICKUP'
                      ? 'bg-accent-primary text-white shadow-sm'
                      : 'text-fg-tertiary hover:text-fg-secondary'
                  }`}
                >
                  {t('inspections.pickupInspection')}
                </button>
                <button
                  type="button"
                  onClick={() => { setType('RETURN'); setRentalId(''); setSelectedRental(null); }}
                  className={`flex-1 h-8 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    type === 'RETURN'
                      ? 'bg-accent-primary text-white shadow-sm'
                      : 'text-fg-tertiary hover:text-fg-secondary'
                  }`}
                >
                  {t('inspections.returnInspection')}
                </button>
              </div>

              <FormField label={type === 'PICKUP' ? t('inspections.pickupRental') : t('inspections.returnRental')} required>
                <select
                  value={rentalId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    const id = e.target.value;
                    setRentalId(id);
                    const rental = rentals.find((r: any) => r.id === id);
                    setSelectedRental(rental || null);
                    if (rental) {
                      setOdometer(rental.returnOdometer || rental.vehicle.odometer);
                    }
                  }}
                  className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                  required
                >
                  <option value="">{type === 'PICKUP' ? t('inspections.choosePickupRental') : t('inspections.chooseReturnRental')}</option>
                  {rentals.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.vehicle.brand.name} {r.vehicle.model.name} ({r.vehicle.plateNumber}) — {r.customer.name}
                    </option>
                  ))}
                </select>
              </FormField>

              {selectedRental && (
                <div className="p-3 rounded-xl bg-bg-inset border border-border-surface/30 grid grid-cols-2 gap-2 text-xs font-semibold">
                  <div>
                    <span className="text-fg-tertiary block text-[9px] uppercase tracking-wider">{t('inspections.assignedVehicle')}</span>
                    <span className="text-fg-main">{selectedRental.vehicle.brand.name} {selectedRental.vehicle.model.name} ({selectedRental.vehicle.plateNumber})</span>
                  </div>
                  <div>
                    <span className="text-fg-tertiary block text-[9px] uppercase tracking-wider">{t('inspections.associatedCustomer')}</span>
                    <span className="text-fg-main">{selectedRental.customer.name}</span>
                  </div>
                </div>
              )}

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

              {/* Vehicle Photos Gallery */}
              <div className="border border-border-surface/30 p-3 rounded-xl bg-bg-surface/10 space-y-3">
                <span className="text-xs font-bold text-accent-primary uppercase tracking-widest flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" />
                  {t('inspections.vehiclePhotos', 'Vehicle Photos')} <span className="text-fg-tertiary font-mono">({vehiclePhotoSlots.filter(s => s.value).length}/5)</span>
                </span>
                <div className="flex flex-wrap gap-3">
                  {vehiclePhotoSlots.map((slot, i) => (
                    <div key={i} className="relative w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.33%-0.5rem)] xl:w-[calc(25%-0.5625rem)] max-w-[240px] group">
                      <FileUploader
                        value={slot.value}
                        onChange={(url) => updateVehiclePhotoSlotValue(i, url)}
                        onFileSelect={(file) => updateVehiclePhotoSlotFile(i, file)}
                        showCamera
                        accept="image/*"
                        compact
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeVehiclePhotoSlot(i); }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-bg-card border border-border-surface/40 flex items-center justify-center text-fg-tertiary hover:text-accent-error hover:border-accent-error/40 transition-all shadow-sm z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {vehiclePhotoSlots.filter(s => s.value).length < 5 && (
                    <button
                      type="button"
                      onClick={addVehiclePhotoSlot}
                      className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.33%-0.5rem)] xl:w-[calc(25%-0.5625rem)] max-w-[240px] aspect-[4/3] rounded-xl border-2 border-dashed border-border-surface/40 bg-bg-inset/50 flex flex-col items-center justify-center gap-1.5 text-fg-tertiary hover:border-accent-primary hover:text-accent-primary transition-all cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{t('inspections.addPhoto', 'Add Photo')}</span>
                    </button>
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
                      checked={missingSpareTire}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMissingSpareTire(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                    />
                    {t('inspections.missingSpareTire')}
                  </label>

                  <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={missingJack}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMissingJack(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                    />
                    {t('inspections.missingJack')}
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
                <Button type="submit" isLoading={createInspectionMutation.isPending || uploadImageMutation.isPending}>
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
