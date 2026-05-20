import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePublicVehicles, usePublicVehicleTypes, usePublicBrands } from '../../Infrastructure/hooks/usePublicCatalog.js';
import { useCreateReservation } from '../../Infrastructure/hooks/useReservations.js';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { StripeCardForm } from '../components/ui/StripeCardForm.js';
import { Search, Calendar, Shield, CreditCard, Check, Sparkles, AlertCircle } from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Mutations
  const createReservationMutation = useCreateReservation();

  // Auto-open booking flow if returning from login/register
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
      navigate('/login', { state: { from: location.pathname, bookVehicleId: vehicle.id } });
      return;
    }
    setSelectedVehicle(vehicle);
    setBookingStep(1);
    setStripePaymentMethodId(null);
    setErrorMessage(null);
  };

  const calculateDays = () => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const diff = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
  };

  const handleConfirmBooking = async () => {
    if (!stripePaymentMethodId) {
      setErrorMessage('Please enter a valid credit card details');
      return;
    }

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
      setErrorMessage(err.message || 'Failed to complete booking reservation. Please try again.');
    }
  };

  const days = calculateDays();
  const basePrice = selectedVehicle ? (selectedVehicle.calculatedDailyRate ?? selectedVehicle.baseDailyRate ?? 0) * days : 0;
  const securityDeposit = 200;
  const totalHold = basePrice + securityDeposit;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main">
          FIND YOUR PERFECT VEHICLE
        </h2>
        <p className="text-xs text-fg-secondary mt-1">
          Explore and rent from our premium fleet of vehicles with transparent pricing.
        </p>
      </div>

      {/* Advanced Filter Panel */}
      <form onSubmit={handleSearch} className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <FormField label="Pick-up Date">
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

        <FormField label="Drop-off Date">
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

        <FormField label="Vehicle Category">
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
          >
            <option value="">All Categories</option>
            {vehicleTypes.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Brand">
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
          >
            <option value="">All Brands</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </FormField>

        <Button type="submit" className="w-full h-9 flex items-center justify-center gap-2">
          <Search size={14} />
          Search
        </Button>
      </form>

      {/* Vehicle Grid List */}
      {isVehiclesLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
          <span className="text-xs text-fg-tertiary font-bold tracking-wider">LOADING CATALOG...</span>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-20 p-6 rounded-2xl border border-dashed border-border-surface/40 bg-bg-surface/10">
          <p className="text-sm font-bold text-fg-secondary">No vehicles available matching filters</p>
          <p className="text-xs text-fg-tertiary mt-1">Try selecting different dates or categories.</p>
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
                  <div className="text-[10px] text-fg-secondary flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Odometer: <span className="text-fg-main">{v.odometer?.toLocaleString() ?? '—'} km</span>
                  </div>
                  <div className="text-[10px] text-fg-secondary flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Fuel: <span className="text-fg-main uppercase">{v.fuelType.name}</span>
                  </div>
                  <div className="text-[10px] text-fg-secondary flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Category: <span className="text-fg-main">{v.vehicleType.name}</span>
                  </div>
                  <div className="text-[10px] text-fg-secondary flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
                    Brand: <span className="text-fg-main">{v.brand.name}</span>
                  </div>
                </div>

                {/* Price and rent action */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-fg-tertiary font-bold block uppercase leading-none">Daily Rate</span>
                    <span className="text-lg font-mono font-black text-fg-main">${(v.calculatedDailyRate ?? v.baseDailyRate ?? 0).toFixed(2)}</span>
                  </div>
                  <Button onClick={() => handleStartBooking(v)} className="!h-8 text-[10px] uppercase font-bold tracking-widest px-4 rounded-lg">
                    Book Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Dialog Modal overlay */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-inset/75 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card border border-border-surface/50 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative space-y-6">
            
            {/* Close button */}
            {bookingStep !== 3 && (
              <button
                onClick={() => setSelectedVehicle(null)}
                className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer"
              >
                ✕
              </button>
            )}

            {/* Header */}
            <div>
              <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">Checkout Wizard</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-1 uppercase">
                {bookingStep === 1 ? 'Review Reservation details' : bookingStep === 2 ? 'Payment Authorization' : 'Reservation Confirmed!'}
              </h2>
            </div>

            {/* Steps indicator */}
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

            {/* STEP 1: Specs review */}
            {bookingStep === 1 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-bg-inset border border-border-surface/40 flex items-center gap-4">
                  <img
                    src={selectedVehicle.imageUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400'}
                    alt={selectedVehicle.model.name}
                    className="w-20 object-contain"
                  />
                  <div>
                    <h3 className="text-[10px] text-fg-tertiary font-bold uppercase">{selectedVehicle.brand.name}</h3>
                    <h4 className="text-sm font-extrabold text-fg-main mt-0.5">{selectedVehicle.model.name}</h4>
                    <span className="text-xs font-mono font-bold text-fg-secondary mt-1 block">${(selectedVehicle.calculatedDailyRate ?? selectedVehicle.baseDailyRate ?? 0).toFixed(2)} / day</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border-surface/20 pt-4">
                  <div className="flex justify-between text-xs font-semibold text-fg-secondary">
                    <span>Rental Period:</span>
                    <span className="text-fg-main">{dateFrom} to {dateTo}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-fg-secondary">
                    <span>Duration:</span>
                    <span className="text-fg-main">{days} {days === 1 ? 'day' : 'days'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-fg-secondary">
                    <span>Daily Rate:</span>
                    <span className="text-fg-main font-mono">${(selectedVehicle.calculatedDailyRate ?? selectedVehicle.baseDailyRate ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-fg-main border-t border-border-surface/10 pt-2">
                    <span>Estimated Rental Total:</span>
                    <span className="font-mono">${basePrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setSelectedVehicle(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setBookingStep(2)}>
                    Next: Payment
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Credit Card Entry & Stripe Pre-auth Hold Collection */}
            {bookingStep === 2 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-accent-primary/20 bg-accent-primary/5 text-fg-secondary text-xs flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-accent-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-fg-primary block">Stripe Pre-Authorization Hold</span>
                    A temporary hold of <strong className="text-fg-main">${totalHold.toFixed(2)}</strong> (Estimated rental ${basePrice.toFixed(2)} + ${securityDeposit} deposit) will be placed on your credit card. No funds are charged immediately.
                  </div>
                </div>

                <StripeCardForm onCardComplete={setStripePaymentMethodId} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setBookingStep(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={handleConfirmBooking}
                    isLoading={createReservationMutation.isPending}
                    disabled={!stripePaymentMethodId}
                    className="flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Place Pre-Auth Hold
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Reservation Confirmed success screen */}
            {bookingStep === 3 && (
              <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-scale-up">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-fg-main uppercase tracking-wider">Booking Successful</h3>
                  <p className="text-xs text-fg-secondary max-w-sm">
                    Your reservation has been locked and Stripe pre-authorization hold successfully verified. An agent will hand you the keys at the counter!
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => setSelectedVehicle(null)}
                  >
                    <Sparkles className="w-4 h-4" />
                    View My Reservations
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
export default CatalogPage;
