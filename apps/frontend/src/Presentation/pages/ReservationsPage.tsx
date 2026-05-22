import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRentalsList, useCreateRental, useRentalReturn, useRentalReturnEstimate } from '../../Infrastructure/hooks/useRentals.js';
import { useVehicles } from '../../Infrastructure/hooks/useCatalog.js';
import { useCustomers, useUpdateCustomer } from '../../Infrastructure/hooks/useCatalog.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { formatCurrency } from '@rent-car/common';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { SignaturePad } from '../components/ui/SignaturePad.js';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../Infrastructure/stripe.js';
import { StripeCardForm } from '../components/ui/StripeCardForm.js';
import { 
  Calendar, Check, User, Sparkles, Play, 
  CornerDownLeft, RefreshCw, AlertCircle
} from 'lucide-react';

export const ReservationsPage: React.FC = () => {
  const { t } = useTranslation();

  // Filters state
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  // Queries
  const { data: rentalsData, isLoading: isRentalsLoading, refetch } = useRentalsList({ status, page, limit: 8 });
  const rentals = rentalsData?.items || [];

  // Stepper Wizards State
  const [checkoutRental, setCheckoutRental] = useState<any | null>(null);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [checkoutOdometer, setCheckoutOdometer] = useState(0);
  const [checkoutFuelLevel, setCheckoutFuelLevel] = useState('FULL');
  const [checkoutSignature, setCheckoutSignature] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Counter edits for incomplete customer profiles
  const [counterNationalId, setCounterNationalId] = useState('');
  const [counterLicenseNumber, setCounterLicenseNumber] = useState('');
  const [counterLicenseCountry, setCounterLicenseCountry] = useState('');
  const [counterLicenseExpDate, setCounterLicenseExpDate] = useState('');
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);

  // Returns Wizard State
  const [returnRental, setReturnRental] = useState<any | null>(null);
  const [returnStep, setReturnStep] = useState(1);
  const [returnOdometer, setReturnOdometer] = useState(0);
  const [returnFuelLevel, setReturnFuelLevel] = useState('FULL');
  const [hasBrokenGlass, setHasBrokenGlass] = useState(false);
  const [damagedTiresCount, setDamagedTiresCount] = useState(0);
  const [hasNewScratches, setHasNewScratches] = useState(false);
  const [returnSignature, setReturnSignature] = useState<string | null>(null);
  const [estimateData, setEstimateData] = useState<any | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Walk-in booking state
  const [isWalkinOpen, setIsWalkinOpen] = useState(false);
  const [walkinCustomer, setWalkinCustomer] = useState('');
  const [walkinVehicle, setWalkinVehicle] = useState('');
  const [walkinStart, setWalkinStart] = useState('');
  const [walkinEnd, setWalkinEnd] = useState('');
  const [walkinOdometer, setWalkinOdometer] = useState(0);
  const [walkinFuel, setWalkinFuel] = useState('FULL');
  const [walkinRate, setWalkinRate] = useState(50);
  const [walkinCardToken, setWalkinCardToken] = useState<string | null>(null);
  const [walkinSignature, setWalkinSignature] = useState<string | null>(null);
  const [walkinError, setWalkinError] = useState<string | null>(null);

  const anyModalOpen = checkoutRental || returnRental || isWalkinOpen;
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCheckoutRental(null);
        setReturnRental(null);
        setIsWalkinOpen(false);
      }
    };
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [anyModalOpen]);

  // Populate helper lists
  const { data: vehiclesData } = useVehicles({});
  const { data: customersData } = useCustomers({});
  const availableVehicles = vehiclesData?.items?.filter((v: any) => v.status === 'AVAILABLE') || [];
  const activeCustomers = customersData?.items?.filter((c: any) => c.status === 'ACTIVE') || [];

  // Mutations
  const createRentalMutation = useCreateRental();
  const returnRentalMutation = useRentalReturn();
  const estimateReturnMutation = useRentalReturnEstimate();
  const updateCustomerMutation = useUpdateCustomer();

  const isCheckoutCustomerProfileIncomplete = 
    !checkoutRental?.customer.nationalId || 
    !checkoutRental?.customer.licenseNumber || 
    !checkoutRental?.customer.licenseCountry || 
    !checkoutRental?.customer.licenseExpDate;

  const handleStartCheckout = (rental: any) => {
    setCheckoutRental(rental);
    setCheckoutStep(1);
    setCheckoutOdometer(rental.vehicle.odometer);
    setCheckoutFuelLevel('FULL');
    setCheckoutSignature(null);
    setCheckoutError(null);

    setCounterNationalId(rental.customer.nationalId || '');
    setCounterLicenseNumber(rental.customer.licenseNumber || '');
    setCounterLicenseCountry(rental.customer.licenseCountry || '');
    setCounterLicenseExpDate(
      rental.customer.licenseExpDate 
        ? new Date(rental.customer.licenseExpDate).toISOString().split('T')[0] 
        : ''
    );
  };

  const handleNextCheckoutStep = async () => {
    setCheckoutError(null);
    if (checkoutStep === 2) {
      if (isCheckoutCustomerProfileIncomplete) {
        if (!counterNationalId || !counterLicenseNumber || !counterLicenseCountry || !counterLicenseExpDate) {
          setCheckoutError(t('common.operationFailed'));
          return;
        }

        setIsUpdatingCustomer(true);
        try {
          const updatedCustomer = await updateCustomerMutation.mutateAsync({
            id: checkoutRental.customer.id,
            data: {
              ...checkoutRental.customer,
              nationalId: counterNationalId,
              licenseNumber: counterLicenseNumber,
              licenseCountry: counterLicenseCountry,
              licenseExpDate: new Date(counterLicenseExpDate).toISOString(),
            },
          });

          setCheckoutRental((prev: any) => ({
            ...prev,
            customer: {
              ...prev.customer,
              ...updatedCustomer,
              nationalId: counterNationalId,
              licenseNumber: counterLicenseNumber,
              licenseCountry: counterLicenseCountry,
              licenseExpDate: new Date(counterLicenseExpDate).toISOString(),
            },
          }));
        } catch (err: any) {
          setCheckoutError(err.message || t('common.operationFailed'));
          setIsUpdatingCustomer(false);
          return;
        } finally {
          setIsUpdatingCustomer(false);
        }
      }

      // Check license expiration
      const expDate = new Date(counterLicenseExpDate);
      if (expDate < new Date()) {
        setCheckoutError(t('common.operationFailed'));
        return;
      }
    }
    if (checkoutStep === 3) {
      if (checkoutOdometer < checkoutRental.vehicle.odometer) {
        setCheckoutError(t('common.operationFailed'));
        return;
      }
    }
    if (checkoutStep === 4) {
      if (!checkoutSignature) {
        setCheckoutError(t('common.operationFailed'));
        return;
      }
    }
    setCheckoutStep(checkoutStep + 1);
  };

  const handleConfirmCheckout = async () => {
    try {
      setCheckoutError(null);
      await createRentalMutation.mutateAsync({
        rentalId: checkoutRental.id,
        checkoutOdometer,
        checkoutFuelLevel,
        signatureUrl: checkoutSignature || '',
      });
      setCheckoutStep(5); // success
      refetch();
    } catch (err: any) {
      setCheckoutError(err.message || t('common.operationFailed'));
    }
  };

  // Return Processing
  const handleStartReturn = (rental: any) => {
    setReturnRental(rental);
    setReturnStep(1);
    setReturnOdometer(rental.vehicle.odometer);
    setReturnFuelLevel(rental.checkoutFuelLevel || 'FULL');
    setHasBrokenGlass(false);
    setDamagedTiresCount(0);
    setHasNewScratches(false);
    setReturnSignature(null);
    setEstimateData(null);
    setReturnError(null);
  };

  const handleEstimateReturn = async () => {
    setReturnError(null);
    if (returnOdometer < returnRental.checkoutOdometer) {
      setReturnError(t('common.operationFailed'));
      return;
    }

    try {
      const data = await estimateReturnMutation.mutateAsync({
        id: returnRental.id,
        data: {
          actualReturnDate: new Date().toISOString(),
          returnOdometer,
          returnFuelLevel,
          hasBrokenGlass,
          damagedTiresCount,
          hasNewScratches
        }
      });
      setEstimateData(data);
      setReturnStep(2); // Step 2: show breakdown & calculations
    } catch (err: any) {
      setReturnError(err.message || t('common.operationFailed'));
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnSignature) {
      setReturnError(t('common.operationFailed'));
      return;
    }

    try {
      setReturnError(null);
      await returnRentalMutation.mutateAsync({
        id: returnRental.id,
        data: {
          actualReturnDate: new Date().toISOString(),
          returnOdometer,
          returnFuelLevel,
          returnSignatureUrl: returnSignature,
          hasBrokenGlass,
          damagedTiresCount,
          hasNewScratches,
          comments: `Returned at odometer ${returnOdometer}.`
        }
      });
      setReturnStep(4); // success
      refetch();
    } catch (err: any) {
      setReturnError(err.message || 'Failed to finalize return check-in.');
    }
  };

  // Direct Walkin counter Booking
  const handleCreateWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinCustomer || !walkinVehicle || !walkinStart || !walkinEnd || !walkinCardToken || !walkinSignature) {
      setWalkinError(t('common.operationFailed'));
      return;
    }
    if (walkinOdometer < 0) {
      setWalkinError(t('common.operationFailed'));
      return;
    }

    try {
      setWalkinError(null);
      await createRentalMutation.mutateAsync({
        customerId: walkinCustomer,
        vehicleId: walkinVehicle,
        rentalDate: new Date(walkinStart).toISOString(),
        scheduledReturnDate: new Date(walkinEnd).toISOString(),
        pricePerDay: Number(walkinRate),
        checkoutOdometer: Number(walkinOdometer),
        checkoutFuelLevel: walkinFuel,
        signatureUrl: walkinSignature,
        stripePaymentMethodId: walkinCardToken,
      });

      setIsWalkinOpen(false);
      setWalkinCustomer('');
      setWalkinVehicle('');
      setWalkinStart('');
      setWalkinEnd('');
      setWalkinCardToken(null);
      setWalkinSignature(null);
      refetch();
    } catch (err: any) {
      setWalkinError(err.message || t('common.operationFailed'));
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-fg-main uppercase">
            {t('reservations.title')}
          </h2>
          <p className="text-xs text-fg-secondary mt-1">
            {t('reservations.subtitle')}
          </p>
        </div>

        <Button onClick={() => setIsWalkinOpen(true)} className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {t('reservations.walkinBooking')}
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => { setStatus(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === '' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            {t('reservations.allContracts')}
          </button>
          <button
            onClick={() => { setStatus('PENDING'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === 'PENDING' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            {t('reservations.pendingReservations')}
          </button>
          <button
            onClick={() => { setStatus('ACTIVE'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === 'ACTIVE' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            {t('reservations.activeRentals')}
          </button>
          <button
            onClick={() => { setStatus('COMPLETED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === 'COMPLETED' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            {t('reservations.completed')}
          </button>
        </div>

        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg bg-bg-inset border border-border-surface/30 text-fg-secondary hover:text-fg-main cursor-pointer"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Reservations Listings */}
      {isRentalsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
          <span className="text-xs text-fg-tertiary font-bold tracking-wider">{t('reservations.loading')}</span>
        </div>
      ) : rentals.length === 0 ? (
        <div className="text-center py-20 p-6 rounded-2xl border border-dashed border-border-surface/40 bg-bg-surface/10">
          <p className="text-sm font-bold text-fg-secondary">{t('reservations.noContracts')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rentals.map((r: any) => (
            <div key={r.id} className="p-5 rounded-2xl border border-border-surface/30 bg-bg-card/45 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-border-surface transition-all">
              
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-bg-inset border border-border-surface/40 p-1 flex items-center justify-center shrink-0">
                  <img
                    src={r.vehicle.imageUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400'}
                    alt={r.vehicle.model.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-fg-tertiary font-bold leading-none">#{r.id.substring(0, 8)}</span>
                    <h3 className="text-sm font-extrabold text-fg-main uppercase">
                      {r.vehicle.brand.name} {r.vehicle.model.name}
                    </h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-fg-tertiary mt-1.5 flex items-center gap-1 font-semibold uppercase">
                    <User className="w-3.5 h-3.5 text-accent-primary" />
                    {t('reservations.customer')} <span className="text-fg-secondary font-bold">{r.customer.name}</span>
                  </p>
                  <p className="text-xs text-fg-tertiary mt-1.5 flex items-center gap-1 font-semibold uppercase">
                    <Calendar className="w-3.5 h-3.5 text-accent-primary" />
                    {new Date(r.rentalDate).toLocaleDateString()} — {new Date(r.scheduledReturnDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {r.status === 'PENDING' && (
                  <Button onClick={() => handleStartCheckout(r)} className="!h-8 text-xs uppercase font-bold tracking-widest px-4 rounded-lg flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5" />
                    {t('reservations.checkout')}
                  </Button>
                )}

                {r.status === 'ACTIVE' && (
                  <Button onClick={() => handleStartReturn(r)} className="!h-8 text-xs uppercase font-bold tracking-widest px-4 rounded-lg bg-emerald-500 border border-emerald-500 hover:bg-emerald-600 flex items-center gap-1.5">
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    {t('reservations.returnVehicle')}
                  </Button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 5-STEP RENTAL CHECKOUT STEPPER DIALOG */}
      {checkoutRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card border border-border-surface max-w-lg w-full rounded-3xl p-6 shadow-2xl backdrop-blur-2xl animate-slide-up relative space-y-6 max-h-[90vh] overflow-y-auto">
            
            {checkoutStep !== 5 && (
              <button
                onClick={() => setCheckoutRental(null)}
                className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer z-10"
              >
                ✕
              </button>
            )}

            <div>
              <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">{t('reservations.checkoutContract')}</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-1 uppercase">
                {checkoutStep === 1 && t('reservations.stepVerify')}
                {checkoutStep === 2 && t('reservations.stepLicense')}
                {checkoutStep === 3 && t('reservations.stepOdometer')}
                {checkoutStep === 4 && t('reservations.stepSignature')}
                {checkoutStep === 5 && t('reservations.stepActivated')}
              </h2>
            </div>

            {/* Stepper Dots */}
            {checkoutStep !== 5 && (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(idx => (
                  <div key={idx} className={`h-1.5 flex-1 rounded-full ${checkoutStep >= idx ? 'bg-accent-primary' : 'bg-white/10'}`} />
                ))}
              </div>
            )}

            {checkoutError && (
              <div className="p-3 rounded-xl bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {checkoutError}
              </div>
            )}

            {/* Step 1: Details */}
            {checkoutStep === 1 && (
              <div className="space-y-4">
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">{t('reservations.customerName')}</td><td className="py-2 text-fg-main font-bold">{checkoutRental.customer.name}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">{t('reservations.vehicleAssigned')}</td><td className="py-2 text-fg-main font-bold">{checkoutRental.vehicle.brand.name} {checkoutRental.vehicle.model.name}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">{t('reservations.plateNumber')}</td><td className="py-2 text-fg-main font-bold font-mono">{checkoutRental.vehicle.plateNumber}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">{t('reservations.rentalDates')}</td><td className="py-2 text-fg-main">{new Date(checkoutRental.rentalDate).toLocaleDateString()} — {new Date(checkoutRental.scheduledReturnDate).toLocaleDateString()}</td></tr>
                  </tbody>
                </table>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutRental(null)}>{t('reservations.cancel')}</Button>
                  <Button onClick={() => setCheckoutStep(2)}>{t('reservations.nextVerify')}</Button>
                </div>
              </div>
            )}

            {/* Step 2: License check */}
            {checkoutStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-inset border border-border-surface/40 space-y-3">
                  <span className="text-xs text-fg-tertiary font-bold block uppercase leading-none">
                    {isCheckoutCustomerProfileIncomplete ? t('reservations.completeProfile') : t('reservations.registeredCreds')}
                  </span>
                  
                  {isCheckoutCustomerProfileIncomplete ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-200">
                        {t('reservations.profileMissing')}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField label={t('reservations.nationalId')} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderId')}
                            value={counterNationalId}
                            onChange={(e) => setCounterNationalId(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.driversLicense')} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderLicense')}
                            value={counterLicenseNumber}
                            onChange={(e) => setCounterLicenseNumber(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.licenseCountry')} required>
                          <Input
                            type="text"
                            placeholder={t('customers.placeholderCountry')}
                            value={counterLicenseCountry}
                            onChange={(e) => setCounterLicenseCountry(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>

                        <FormField label={t('reservations.licenseExpiry')} required>
                          <Input
                            type="date"
                            value={counterLicenseExpDate}
                            onChange={(e) => setCounterLicenseExpDate(e.target.value)}
                            className="!h-9 rounded-lg"
                          />
                        </FormField>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-fg-tertiary block text-xs">{t('reservations.licenseNumberLabel')}</span>
                        <span className="text-fg-main font-bold font-mono">{checkoutRental.customer.licenseNumber}</span>
                      </div>
                      <div>
                        <span className="text-fg-tertiary block text-xs">{t('reservations.expirationDate')}</span>
                        <span className={`font-bold ${new Date(checkoutRental.customer.licenseExpDate) < new Date() ? 'text-accent-error' : 'text-emerald-500'}`}>
                          {new Date(checkoutRental.customer.licenseExpDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-fg-tertiary block text-xs">{t('reservations.licenseCountryLabel')}</span>
                        <span className="text-fg-main font-bold">{checkoutRental.customer.licenseCountry || '—'}</span>
                      </div>
                      <div>
                        <span className="text-fg-tertiary block text-xs">{t('reservations.nationalIdLabel')}</span>
                        <span className="text-fg-main font-bold">{checkoutRental.customer.nationalId}</span>
                      </div>
                      <div>
                        <span className="text-fg-tertiary block text-xs">{t('reservations.profileStatus')}</span>
                        <span className="text-emerald-500 font-bold uppercase">{checkoutRental.customer.status}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutStep(1)}>{t('reservations.back')}</Button>
                  <Button onClick={handleNextCheckoutStep} isLoading={isUpdatingCustomer}>
                    {isCheckoutCustomerProfileIncomplete ? t('reservations.saveContinue') : t('reservations.nextOdometer')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Odometer & Fuel Check */}
            {checkoutStep === 3 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-white/5 bg-bg-inset text-xs text-fg-tertiary">
                  {t('reservations.odometerInfo', { odometer: checkoutRental.vehicle.odometer })}
                </div>

                <FormField label={t('reservations.checkoutOdometer')} required>
                  <Input
                    type="number"
                    value={checkoutOdometer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCheckoutOdometer(Number(e.target.value))}
                    className="!h-9 rounded-lg"
                  />
                </FormField>

                <FormField label={t('reservations.checkoutFuel')} required>
                  <select
                    value={checkoutFuelLevel}
                    onChange={(e) => setCheckoutFuelLevel(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                  >
                    <option value="FULL">{t('common.fuelFull')}</option>
                    <option value="THREE_QUARTERS">{t('common.fuelThreeQuarters')}</option>
                    <option value="HALF">{t('common.fuelHalf')}</option>
                    <option value="QUARTER">{t('common.fuelQuarter')}</option>
                    <option value="EMPTY">{t('common.fuelEmpty')}</option>
                  </select>
                </FormField>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutStep(2)}>{t('reservations.back')}</Button>
                  <Button onClick={handleNextCheckoutStep}>{t('reservations.nextSignature')}</Button>
                </div>
              </div>
            )}

            {/* Step 4: Draw Hand Signature */}
            {checkoutStep === 4 && (
              <div className="space-y-4">
                <span className="text-xs font-semibold text-fg-secondary block">{t('reservations.signaturePrompt')}</span>
                <SignaturePad onChange={setCheckoutSignature} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutStep(3)}>{t('reservations.back')}</Button>
                  <Button
                    onClick={handleConfirmCheckout}
                    isLoading={createRentalMutation.isPending}
                    disabled={!checkoutSignature}
                  >
                    {t('reservations.authorizeCheckout')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Success screen */}
            {checkoutStep === 5 && (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-scale-up">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-fg-main uppercase tracking-wider">{t('reservations.checkoutComplete')}</h3>
                  <p className="text-xs text-fg-secondary max-w-sm">
                    {t('reservations.checkoutDesc')}
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button className="w-full" onClick={() => setCheckoutRental(null)}>
                    {t('reservations.dismiss')}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* RENTAL RETURN CHECK-IN DIALOG */}
      {returnRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card border border-border-surface max-w-lg w-full rounded-3xl p-6 shadow-2xl backdrop-blur-2xl animate-slide-up relative space-y-6 max-h-[90vh] overflow-y-auto">
            
            {returnStep !== 4 && (
              <button
                onClick={() => setReturnRental(null)}
                className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer z-10"
              >
                ✕
              </button>
            )}

            <div>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block font-sans">{t('reservations.returnDesk')}</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-1 uppercase">
                {returnStep === 1 && t('reservations.stepReturnParams')}
                {returnStep === 2 && t('reservations.stepPenalty')}
                {returnStep === 3 && t('reservations.stepReturnSignature')}
                {returnStep === 4 && t('reservations.stepFinalized')}
              </h2>
            </div>

            {returnError && (
              <div className="p-3 rounded-xl bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {returnError}
              </div>
            )}

            {/* Step 1: Return check-in logs */}
            {returnStep === 1 && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-bg-inset text-xs text-fg-tertiary">
                  {t('reservations.checkoutDetails', { odometer: returnRental.checkoutOdometer, fuelLevel: returnRental.checkoutFuelLevel })}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label={t('reservations.returnOdometer')} required>
                    <Input
                      type="number"
                      value={returnOdometer}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReturnOdometer(Number(e.target.value))}
                      className="!h-9 rounded-lg"
                    />
                  </FormField>

                  <FormField label={t('reservations.returnFuel')} required>
                    <select
                      value={returnFuelLevel}
                      onChange={(e) => setReturnFuelLevel(e.target.value)}
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

                <div className="p-4 rounded-xl border border-border-surface/30 space-y-3 bg-bg-surface/10">
                  <span className="text-xs font-bold uppercase tracking-widest text-accent-primary block">{t('reservations.inspectDamage')}</span>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasBrokenGlass}
                        onChange={(e) => setHasBrokenGlass(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                      />
                      {t('reservations.brokenGlass')}
                    </label>

                    <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasNewScratches}
                        onChange={(e) => setHasNewScratches(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                      />
                      {t('reservations.newScratches')}
                    </label>
                  </div>

                  <FormField label={t('reservations.damagedTires')}>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={damagedTiresCount}
                      onChange={(e) => setDamagedTiresCount(Number(e.target.value))}
                      className="w-20 h-8 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-bold text-center outline-none focus:border-accent-primary"
                    />
                  </FormField>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setReturnRental(null)}>{t('reservations.cancel')}</Button>
                  <Button
                    onClick={handleEstimateReturn}
                    isLoading={estimateReturnMutation.isPending}
                    className="flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('reservations.estimatePenalty')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Live breakdown estimates */}
            {returnStep === 2 && estimateData && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-inset border border-border-surface/40 space-y-2 text-xs">
                  <div className="flex justify-between text-fg-tertiary">
                    <span>{t('reservations.baseCost')}</span>
                    <span className="font-mono text-fg-main font-semibold">{formatCurrency(estimateData.baseCost)}</span>
                  </div>
                  {estimateData.lateFee > 0 && (
                    <div className="flex justify-between text-accent-error">
                      <span>{t('reservations.lateFee', { hours: estimateData.lateHours.toFixed(1) })}</span>
                      <span className="font-mono font-bold">{formatCurrency(estimateData.lateFee)}</span>
                    </div>
                  )}
                  {estimateData.fuelFee > 0 && (
                    <div className="flex justify-between text-accent-error">
                      <span>{t('reservations.refuelPenalty', { steps: estimateData.fuelDifference })}</span>
                      <span className="font-mono font-bold">{formatCurrency(estimateData.fuelFee)}</span>
                    </div>
                  )}
                  {estimateData.totalDamageFee > 0 && (
                    <div className="flex justify-between text-accent-error">
                      <span>{t('reservations.damagePenalty')}</span>
                      <span className="font-mono font-bold">{formatCurrency(estimateData.totalDamageFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-fg-main border-t border-white/10 pt-2.5">
                    <span>{t('reservations.finalCost')}</span>
                    <span className="font-mono">{formatCurrency(estimateData.totalFinalCost)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setReturnStep(1)}>{t('reservations.back')}</Button>
                  <Button onClick={() => setReturnStep(3)}>{t('reservations.nextSignature')}</Button>
                </div>
              </div>
            )}

            {/* Step 3: Draw Hand Signature return */}
            {returnStep === 3 && (
              <div className="space-y-4">
                <span className="text-xs font-semibold text-fg-secondary block">{t('reservations.returnSignaturePrompt')}</span>
                <SignaturePad onChange={setReturnSignature} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setReturnStep(2)}>{t('reservations.back')}</Button>
                  <Button
                    onClick={handleConfirmReturn}
                    isLoading={returnRentalMutation.isPending}
                    disabled={!returnSignature}
                  >
                    {t('reservations.confirmReturn')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Success Return check-in */}
            {returnStep === 4 && (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-scale-up">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-fg-main uppercase tracking-wider">{t('reservations.returnFinalized')}</h3>
                  <p className="text-xs text-fg-secondary max-w-sm">
                    {t('reservations.returnDesc')}
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button className="w-full" onClick={() => setReturnRental(null)}>
                    {t('reservations.dismiss')}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* WALK-IN DIALOG OVERLAY */}
      {isWalkinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card border border-border-surface max-w-lg w-full rounded-3xl p-6 shadow-2xl backdrop-blur-2xl animate-slide-up relative space-y-5 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsWalkinOpen(false)}
              className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer z-10"
            >
              ✕
            </button>

            <div>
              <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">{t('reservations.counterDesk')}</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-0.5 uppercase">{t('reservations.counterWalkin')}</h2>
            </div>

            {walkinError && (
              <div className="p-2.5 rounded-lg bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold">
                {walkinError}
              </div>
            )}

            <form onSubmit={handleCreateWalkin} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('reservations.selectCustomer')} required>
                  <select
                    value={walkinCustomer}
                    onChange={(e) => setWalkinCustomer(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none"
                    required
                  >
                    <option value="">{t('reservations.chooseCustomer')}</option>
                    {activeCustomers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label={t('reservations.selectVehicle')} required>
                  <select
                    value={walkinVehicle}
                    onChange={(e) => {
                      setWalkinVehicle(e.target.value);
                      const selected = availableVehicles.find((v: any) => v.id === e.target.value);
                      if (selected) {
                        setWalkinOdometer(selected.odometer);
                        const rates: any = { sedan: 45, suv: 75, truck: 85 };
                        const typeName = selected.vehicleType.name.toLowerCase();
                        setWalkinRate(rates[typeName] || 50);
                      }
                    }}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none"
                    required
                  >
                    <option value="">{t('reservations.chooseCar')}</option>
                    {availableVehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.brand.name} {v.model.name} ({v.plateNumber})</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t('reservations.rentalStart')} required>
                  <Input
                    type="date"
                    value={walkinStart}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinStart(e.target.value)}
                    className="!h-9 rounded-lg"
                    required
                  />
                </FormField>

                <FormField label={t('reservations.returnDate')} required>
                  <Input
                    type="date"
                    value={walkinEnd}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinEnd(e.target.value)}
                    className="!h-9 rounded-lg"
                    required
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField label={t('reservations.startOdometer')} required>
                  <Input
                    type="number"
                    value={walkinOdometer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinOdometer(Number(e.target.value))}
                    className="!h-9 rounded-lg"
                    required
                  />
                </FormField>

                <FormField label={t('reservations.startFuel')} required>
                  <select
                    value={walkinFuel}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWalkinFuel(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none"
                  >
                    <option value="FULL">{t('common.fuelFull')}</option>
                    <option value="THREE_QUARTERS">{t('common.fuelThreeQuarters')}</option>
                    <option value="HALF">{t('common.fuelHalf')}</option>
                    <option value="QUARTER">{t('common.fuelQuarter')}</option>
                    <option value="EMPTY">{t('common.fuelEmpty')}</option>
                  </select>
                </FormField>

                <FormField label={t('reservations.dailyRate')} required>
                  <Input
                    type="number"
                    value={walkinRate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinRate(Number(e.target.value))}
                    className="!h-9 rounded-lg"
                    required
                  />
                </FormField>
              </div>

              <div className="border-t border-border-surface/15 pt-4">
                <span className="text-xs font-bold text-accent-primary uppercase tracking-widest block mb-2">{t('reservations.cardDetails')}</span>
                <Elements stripe={stripePromise}>
                  <StripeCardForm onCardComplete={setWalkinCardToken} />
                </Elements>
              </div>

              <div className="border-t border-border-surface/15 pt-4">
                <span className="text-xs font-bold text-accent-primary uppercase tracking-widest block mb-2">{t('reservations.customerSignature')}</span>
                <SignaturePad onChange={setWalkinSignature} />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-surface/15">
                <Button type="button" variant="secondary" onClick={() => setIsWalkinOpen(false)}>{t('reservations.cancel')}</Button>
                <Button
                  type="submit"
                  isLoading={createRentalMutation.isPending}
                  disabled={!walkinCardToken || !walkinSignature}
                >
                  {t('reservations.createContract')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default ReservationsPage;
