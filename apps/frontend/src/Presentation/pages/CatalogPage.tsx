import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePublicVehicles, usePublicVehicleTypes, usePublicBrands } from '../../Infrastructure/hooks/usePublicCatalog.js';
import { useCreateReservation } from '../../Infrastructure/hooks/useReservations.js';
import { useFeeConfigs, useMyPaymentMethods, useDeleteMyPaymentMethod } from '../../Infrastructure/hooks/useCatalog.js';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { useQuickRegister } from '../../Infrastructure/hooks/useQuickRegister.js';
import { FormModal } from '../components/ui/FormModal.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { formatCurrency } from '@rent-car/common';
import { FormField } from '../components/ui/FormField.js';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../Infrastructure/stripe.js';
import { StripeCardForm } from '../components/ui/StripeCardForm.js';
import { Toast } from '../components/ui/Toast.js';
import { Search, Calendar, Shield, CreditCard, Check, Sparkles, AlertCircle, Trash2 } from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Quick Signup modal state
  const [quickSignupVehicle, setQuickSignupVehicle] = useState<any | null>(null);
  const [quickFirstName, setQuickFirstName] = useState('');
  const [quickLastName, setQuickLastName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickExistsEmail, setQuickExistsEmail] = useState<string | null>(null);
  const [quickPassword, setQuickPassword] = useState('');
  const [quickLoginLoading, setQuickLoginLoading] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hook for quick registration
  const quickRegisterMutation = useQuickRegister();

  // Search filter states
  const [typeId, setTypeId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // tomorrow
  const [dateTo, setDateTo] = useState(new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0]); // +3 days
  const seats = undefined;

  // Detail Modal & Booking Wizard state
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [bookingStep, setBookingStep] = useState(1); // 1 = Details, 2 = Payment & Billing, 3 = Confirmation
  const [stripePaymentMethodId, setStripePaymentMethodId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);

  // Saved Cards Queries & Mutations
  const { data: savedCards = [], refetch: refetchSavedCards } = useMyPaymentMethods();
  const deleteCardMutation = useDeleteMyPaymentMethod();

  // Reset/default saved card selection when entering Step 2
  useEffect(() => {
    if (bookingStep === 2) {
      if (savedCards && savedCards.length > 0) {
        setUseNewCard(false);
        setStripePaymentMethodId(savedCards[0].id);
      } else {
        setUseNewCard(true);
        setStripePaymentMethodId(null);
      }
    }
  }, [bookingStep, savedCards]);

  // Queries
  const { data: vehicles = [], isLoading: isVehiclesLoading, refetch } = usePublicVehicles({
    typeId,
    brandId,
    dateFrom,
    dateTo,
    seats
  });

  const { data: vehicleTypes = [] } = usePublicVehicleTypes();
  const { data: brands = [] } = usePublicBrands();
  const { data: feeConfigs = [] } = useFeeConfigs();

  // Mutations
  const createReservationMutation = useCreateReservation();

  // Auto-open booking flow if returning from login
  useEffect(() => {
    const state = location.state as any;
    if (state?.bookVehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find((v: any) => v.id === state.bookVehicleId);
      if (vehicle) {
        // Clear location state to prevent repeating on refresh
        navigate(location.pathname, { replace: true, state: {} });
        setSelectedVehicle(vehicle);
        setBookingStep(1);
        setStripePaymentMethodId(null);
        setErrorMessage(null);
      }
    }
  }, [location.state, vehicles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  const handleStartBooking = (vehicle: any) => {
    if (!isAuthenticated) {
      setQuickSignupVehicle(vehicle);
      return;
    }
    setSelectedVehicle(vehicle);
    setBookingStep(1);
    setStripePaymentMethodId(null);
    setErrorMessage(null);
  };

  const handleQuickSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);
    try {
      const res = await quickRegisterMutation.mutateAsync({
        email: quickEmail,
        firstName: quickFirstName,
        lastName: quickLastName,
      });

      if ('exists' in res) {
        setQuickExistsEmail(res.email);
        return;
      }

      // Log in immediately via AuthContext
      await login(res.accessToken, res.user, res.refreshToken);

      // Toast success message notifying user that a temporary password was sent
      setToastMessage(t('auth.tempPasswordNotice'));

      // Close modal
      const vehicle = quickSignupVehicle;
      setQuickSignupVehicle(null);
      setQuickFirstName('');
      setQuickLastName('');
      setQuickEmail('');

      // Open reservation wizard
      setSelectedVehicle(vehicle);
      setBookingStep(1);
      setStripePaymentMethodId(null);
      setErrorMessage(null);
    } catch (err: any) {
      setQuickError(err.message || t('common.operationFailed'));
    }
  };

  const handleQuickLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);
    setQuickLoginLoading(true);
    try {
      await login(quickEmail, quickPassword);
      const vehicle = quickSignupVehicle;
      setQuickSignupVehicle(null);
      setQuickFirstName('');
      setQuickLastName('');
      setQuickEmail('');
      setQuickPassword('');
      setQuickExistsEmail(null);
      setSelectedVehicle(vehicle);
      setBookingStep(1);
      setStripePaymentMethodId(null);
      setErrorMessage(null);
    } catch (err: any) {
      setQuickError(err.message || t('auth.signInFailed'));
    } finally {
      setQuickLoginLoading(false);
    }
  };

  const calculateDays = () => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const diff = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
  };

  const handleConfirmBooking = async () => {
    if (!stripePaymentMethodId) {
      setErrorMessage(t('catalog.cardDetailsRequired'));
      return;
    }

    console.log("Booking details:", {
      vehicleId: selectedVehicle.id,
      rentalDate: dateFrom,
      scheduledReturnDate: dateTo,
      stripePaymentMethodId
    });

    try {
      setErrorMessage(null);
      await createReservationMutation.mutateAsync({
        vehicleId: selectedVehicle.id,
        rentalDate: dateFrom,
        scheduledReturnDate: dateTo,
        stripePaymentMethodId
      });
      setBookingStep(3); // success
    } catch (err: any) {
      setErrorMessage(err.message || t('common.operationFailed'));
    }
  };

  const days = calculateDays();
  const basePrice = selectedVehicle ? (selectedVehicle.calculatedDailyRate ?? selectedVehicle.baseDailyRate ?? 0) * days : 0;
  const securityDeposit = (feeConfigs as any[]).find((f: any) => f.key === 'SECURITY_DEPOSIT')?.amount ?? 15000;
  const totalHold = basePrice + securityDeposit;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main">
          {t('catalog.title')}
        </h2>
        <p className="text-xs text-fg-secondary mt-1">
          {t('catalog.subtitle')}
        </p>
      </div>

      {/* Advanced Filter Panel */}
      <form onSubmit={handleSearch} className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <FormField label={t('catalog.pickupDate')}>
          <div className="relative">
            <Input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="!h-9 rounded-lg pl-9"
            />
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-fg-tertiary" />
          </div>
        </FormField>

        <FormField label={t('catalog.dropoffDate')}>
          <div className="relative">
            <Input
              type="date"
              min={dateFrom}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="!h-9 rounded-lg pl-9"
            />
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-fg-tertiary" />
          </div>
        </FormField>

        <FormField label={t('catalog.vehicleCategory')}>
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
          >
            <option value="">{t('catalog.allCategories')}</option>
            {vehicleTypes.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label={t('catalog.brand')}>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
          >
            <option value="">{t('catalog.allBrands')}</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </FormField>

        <Button type="submit" className="w-full h-9 flex items-center justify-center gap-2">
          <Search size={14} />
          {t('catalog.search')}
        </Button>
      </form>

      {/* Vehicle Grid List */}
      {isVehiclesLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
          <span className="text-xs text-fg-tertiary font-bold tracking-wider">{t('catalog.loading')}</span>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-20 p-6 rounded-2xl border border-dashed border-border-surface/40 bg-bg-surface/10">
          <p className="text-sm font-bold text-fg-secondary">{t('catalog.noVehicles')}</p>
          <p className="text-xs text-fg-tertiary mt-1">{t('catalog.tryDifferent')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v: any) => (
            <div key={v.id} className="group rounded-2xl border border-border-surface/30 bg-bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col justify-between hover:border-border-surface transition-all duration-300">
              {/* Card Photo placeholder */}
              <div className="relative h-44 bg-bg-inset flex items-center justify-center p-6 border-b border-border-surface/20 group-hover:bg-bg-inset/70 transition-all">
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full border border-accent-primary/20 bg-accent-primary/10 text-[9px] font-bold text-accent-primary uppercase tracking-wider">
                  {v.vehicleType.name}
                </div>
                <img
                  src={v.imageUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400'}
                  alt={v.model.name}
                  className="max-h-full object-contain filter drop-shadow-xl group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Specs */}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-fg-tertiary uppercase tracking-wider">{v.brand.name}</h3>
                  <h2 className="text-base font-extrabold text-fg-main leading-tight mt-0.5">{v.model.name}</h2>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-border-surface/15 py-3">
                  <div className="text-xs text-fg-secondary flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    {t('catalog.odometer')} <span className="text-fg-main">{v.odometer?.toLocaleString() ?? '—'} km</span>
                  </div>
                  <div className="text-xs text-fg-secondary flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    {t('catalog.fuel')} <span className="text-fg-main uppercase">{v.fuelType.name}</span>
                  </div>
                  <div className="text-xs text-fg-secondary flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    {t('catalog.category')} <span className="text-fg-main">{v.vehicleType.name}</span>
                  </div>
                  <div className="text-xs text-fg-secondary flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    {t('catalog.brandLabel')} <span className="text-fg-main">{v.brand.name}</span>
                  </div>
                </div>

                {/* Price / Action area */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-lg font-extrabold text-fg-main font-mono">{formatCurrency(v.calculatedDailyRate ?? v.baseDailyRate ?? 0)}</span>
                    <span className="text-xs text-fg-tertiary ml-1 font-semibold">{t('catalog.perDay')}</span>
                  </div>
                  <Button size="sm" onClick={() => handleStartBooking(v)}>
                    {t('catalog.bookNow')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Dialog Modal overlay */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-bg-card border border-border-surface max-w-lg w-full rounded-3xl p-6 shadow-2xl backdrop-blur-2xl animate-slide-up relative space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer z-10"
            >
              ✕
            </button>
            <div>
              <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">{t('catalog.checkoutWizard')}</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-1 uppercase">
                {bookingStep === 1 ? t('catalog.reviewReservation') : bookingStep === 2 ? t('catalog.paymentAuth') : t('catalog.bookingConfirmed')}
              </h2>
            </div>
            {bookingStep !== 3 && (
              <div className="flex items-center gap-1">
                <div className={`h-1 flex-1 rounded-full ${bookingStep >= 1 ? 'bg-accent-primary' : 'bg-white/10'}`} />
                <div className={`h-1 flex-1 rounded-full ${bookingStep >= 2 ? 'bg-accent-primary' : 'bg-white/10'}`} />
                <div className="h-1 flex-1 rounded-full bg-white/10" />
              </div>
            )}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMessage}
              </div>
            )}
            {bookingStep === 1 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-bg-inset border border-border-surface/40 flex items-center gap-4">
                  <img
                    src={selectedVehicle.imageUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400'}
                    alt={selectedVehicle.model.name}
                    className="w-20 object-contain"
                  />
                  <div>
                    <h3 className="text-xs text-fg-tertiary font-bold uppercase">{selectedVehicle.brand.name}</h3>
                    <h4 className="text-sm font-extrabold text-fg-main mt-0.5">{selectedVehicle.model.name}</h4>
                    <span className="text-xs font-mono font-bold text-fg-secondary mt-1 block">{formatCurrency(selectedVehicle.calculatedDailyRate ?? selectedVehicle.baseDailyRate ?? 0)} {t('catalog.perDay')}</span>
                  </div>
                </div>
                <div className="space-y-2 border-t border-border-surface/20 pt-4">
                  <div className="flex justify-between text-xs font-semibold text-fg-secondary">
                    <span>{t('catalog.rentalPeriod')}</span>
                    <span className="text-fg-main">{dateFrom} to {dateTo}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-fg-secondary">
                    <span>{t('catalog.duration')}</span>
                    <span className="text-fg-main">{days} {t(days === 1 ? 'catalog.day' : 'catalog.days')}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-fg-secondary">
                    <span>{t('catalog.dailyRateLabel')}</span>
                    <span className="text-fg-main font-mono">{formatCurrency(selectedVehicle.calculatedDailyRate ?? selectedVehicle.baseDailyRate ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-fg-main border-t border-border-surface/10 pt-2">
                    <span>{t('catalog.estimatedTotal')}</span>
                    <span className="font-mono">{formatCurrency(basePrice)}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setSelectedVehicle(null)}>
                    {t('catalog.cancel')}
                  </Button>
                  <Button onClick={() => setBookingStep(2)}>
                    {t('catalog.nextPayment')}
                  </Button>
                </div>
              </div>
            )}
            {bookingStep === 2 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-accent-primary/20 bg-accent-primary/5 text-fg-secondary text-xs flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-accent-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-fg-primary block">{t('catalog.preAuthHold')}</span>
                    {t('catalog.preAuthDesc', { totalHold: formatCurrency(totalHold), basePrice: formatCurrency(basePrice), securityDeposit: formatCurrency(securityDeposit) })}
                  </div>
                </div>
                {savedCards.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-fg-secondary uppercase tracking-wider block">
                      {t('stripe.savedPaymentMethods', 'Saved Payment Methods')}
                    </span>
                    <div className="space-y-2">
                      {savedCards.map((card: any) => (
                        <div
                          key={card.id}
                          onClick={() => {
                            setUseNewCard(false);
                            setStripePaymentMethodId(card.id);
                          }}
                          className={`p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                            !useNewCard && stripePaymentMethodId === card.id
                              ? 'border-accent-primary bg-accent-primary/5'
                              : 'border-border-surface/30 bg-bg-inset/40 hover:border-border-surface/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="savedCard"
                              checked={!useNewCard && stripePaymentMethodId === card.id}
                              onChange={() => {}} // handled by parent click
                              className="accent-accent-primary"
                            />
                            <div className="text-left">
                              <p className="text-xs font-bold text-fg-main uppercase">
                                {card.card.brand} ending in {card.card.last4}
                              </p>
                              <p className="text-[10px] text-fg-tertiary">
                                Expires {card.card.exp_month}/{card.card.exp_year}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(t('stripe.confirmRemoveCard', 'Are you sure you want to remove this card?'))) {
                                try {
                                  setErrorMessage(null);
                                  await deleteCardMutation.mutateAsync(card.id);
                                  setToastMessage(t('stripe.cardRemoved', 'Card removed successfully'));
                                  refetchSavedCards();
                                } catch (err: any) {
                                  setErrorMessage(err.message || t('common.operationFailed'));
                                }
                              }
                            }}
                            className="p-2 text-fg-tertiary hover:text-accent-error transition-all rounded-lg hover:bg-white/5 cursor-pointer flex items-center justify-center shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      <div
                        onClick={() => {
                          setUseNewCard(true);
                          setStripePaymentMethodId(null);
                        }}
                        className={`p-4 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                          useNewCard
                            ? 'border-accent-primary bg-accent-primary/5'
                            : 'border-border-surface/30 bg-bg-inset/40 hover:border-border-surface/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedCard"
                          checked={useNewCard}
                          onChange={() => {}}
                          className="accent-accent-primary"
                        />
                        <div className="text-left">
                          <p className="text-xs font-bold text-fg-main uppercase">
                            {t('stripe.useNewCard', 'Use a new credit card')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {useNewCard ? (
                  <Elements stripe={stripePromise}>
                    <StripeCardForm onCardComplete={setStripePaymentMethodId} onCardSuccess={() => setToastMessage(t('stripe.cardConfirmed'))} />
                  </Elements>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {t('stripe.savedCardSelected', 'Saved card selected for pre-authorization hold.')}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setBookingStep(1)}>
                    {t('catalog.back')}
                  </Button>
                  <Button
                    onClick={handleConfirmBooking}
                    isLoading={createReservationMutation.isPending}
                    disabled={!stripePaymentMethodId}
                    className="flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {t('catalog.placeHold')}
                  </Button>
                </div>
              </div>
            )}
            {bookingStep === 3 && (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-scale-up">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-fg-main uppercase tracking-wider">{t('catalog.bookingSuccess')}</h3>
                  <p className="text-xs text-fg-secondary max-w-sm">
                    {t('catalog.bookingSuccessDesc')}
                  </p>
                </div>
                <div className="pt-4 w-full">
                  <Button
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => navigate('/customer/reservations')}
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('catalog.viewReservations')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Signup Modal */}
      {quickSignupVehicle && !quickExistsEmail && (
        <FormModal isOpen={!!(quickSignupVehicle && !quickExistsEmail)} onClose={() => setQuickSignupVehicle(null)} title={t('auth.createAccount')}>
          <form onSubmit={handleQuickSignupSubmit} className="space-y-6">
            <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">{t('auth.quickSignup')}</span>
            <p className="text-xs text-fg-secondary">{t('auth.quickSignupSubtitle')}</p>
            {quickError && (
              <div className="p-3 rounded-xl bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {quickError}
              </div>
            )}
            <div className="space-y-4">
              <FormField label={t('auth.firstName')} required>
                <Input type="text" placeholder={t('auth.firstName')} value={quickFirstName} onChange={(e) => setQuickFirstName(e.target.value)} required />
              </FormField>
              <FormField label={t('auth.lastName')} required>
                <Input type="text" placeholder={t('auth.lastName')} value={quickLastName} onChange={(e) => setQuickLastName(e.target.value)} required />
              </FormField>
              <FormField label={t('auth.emailAddress')} required>
                <Input type="email" placeholder={t('auth.emailAddress')} value={quickEmail} onChange={(e) => setQuickEmail(e.target.value)} required />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setQuickSignupVehicle(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" isLoading={quickRegisterMutation.isPending}>
                {t('auth.continue')}
              </Button>
            </div>
          </form>
        </FormModal>
      )}

      {/* Account Exists — Login + Magic Link Modal */}
      {quickSignupVehicle && quickExistsEmail && (
        <FormModal isOpen={!!(quickSignupVehicle && quickExistsEmail)} onClose={() => {
          setQuickSignupVehicle(null);
          setQuickExistsEmail(null);
          setQuickPassword('');
          setQuickError(null);
        }} title={t('auth.welcomeBack')}>
          <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">{t('auth.accountExists')}</span>
          <p className="text-xs text-fg-secondary mt-1 mb-4">{t('auth.magicLinkSent', { email: quickExistsEmail })}</p>
          <form onSubmit={handleQuickLoginSubmit} className="space-y-6">

            {quickError && (
              <div className="p-3 rounded-xl bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {quickError}
              </div>
            )}

            <div className="space-y-4">
              <FormField label={t('auth.emailAddress')} required>
                <Input
                  type="email"
                  value={quickEmail}
                  disabled
                />
              </FormField>

              <FormField label={t('auth.password')} required>
                <Input
                  type="password"
                  placeholder={t('auth.password')}
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  required
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setQuickExistsEmail(null);
                  setQuickPassword('');
                  setQuickError(null);
                }}
              >
                {t('common.back')}
              </Button>
              <Button type="submit" isLoading={quickLoginLoading}>
                {t('auth.signIn')}
              </Button>
            </div>
          </form>
        </FormModal>
      )}

      {/* Toast notifications */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

    </div>
  );
};
export default CatalogPage;
