import React, { useState } from 'react';
import { useRentalsList, useCreateRental, useRentalReturn, useRentalReturnEstimate } from '../../Infrastructure/hooks/useRentals.js';
import { useVehicles } from '../../Infrastructure/hooks/useCatalog.js';
import { useCustomers } from '../../Infrastructure/hooks/useCatalog.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { SignaturePad } from '../components/ui/SignaturePad.js';
import { StripeCardForm } from '../components/ui/StripeCardForm.js';
import { 
  Calendar, Check, User, Sparkles, Play, 
  CornerDownLeft, RefreshCw, AlertCircle
} from 'lucide-react';

export const ReservationsPage: React.FC = () => {

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

  // Populate helper lists
  const { data: vehiclesData } = useVehicles({});
  const { data: customersData } = useCustomers({});
  const availableVehicles = vehiclesData?.items?.filter((v: any) => v.status === 'AVAILABLE') || [];
  const activeCustomers = customersData?.items?.filter((c: any) => c.status === 'ACTIVE') || [];

  // Mutations
  const createRentalMutation = useCreateRental();
  const returnRentalMutation = useRentalReturn();
  const estimateReturnMutation = useRentalReturnEstimate();

  const handleStartCheckout = (rental: any) => {
    setCheckoutRental(rental);
    setCheckoutStep(1);
    setCheckoutOdometer(rental.vehicle.odometer);
    setCheckoutFuelLevel('FULL');
    setCheckoutSignature(null);
    setCheckoutError(null);
  };

  const handleNextCheckoutStep = () => {
    setCheckoutError(null);
    if (checkoutStep === 2) {
      // Check license expiration
      const expDate = new Date(checkoutRental.customer.licenseExpDate);
      if (expDate < new Date()) {
        setCheckoutError("Customer's driver's license is expired. Cannot authorize checkout!");
        return;
      }
    }
    if (checkoutStep === 3) {
      if (checkoutOdometer < checkoutRental.vehicle.odometer) {
        setCheckoutError(`Odometer reading cannot be less than current odometer (${checkoutRental.vehicle.odometer})`);
        return;
      }
    }
    if (checkoutStep === 4) {
      if (!checkoutSignature) {
        setCheckoutError("Customer hand signature is required.");
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
      setCheckoutError(err.message || 'Failed to authorize rental checkout contract.');
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
      setReturnError(`Return odometer cannot be less than checkout odometer (${returnRental.checkoutOdometer})`);
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
      setReturnError(err.message || 'Failed to estimate return costs.');
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnSignature) {
      setReturnError('Return checkout hand signature is required.');
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
      setWalkinError('All fields, card pre-auth, and signatures are required.');
      return;
    }
    if (walkinOdometer < 0) {
      setWalkinError('Starting odometer is required.');
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
      setWalkinError(err.message || 'Failed to complete walk-in booking.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-fg-main uppercase">
            Rental Operations Desk
          </h2>
          <p className="text-xs text-fg-secondary mt-1">
            Checkout pending reservations, return active contracts, and book walk-in customers.
          </p>
        </div>

        <Button onClick={() => setIsWalkinOpen(true)} className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Walk-in Rental Checkout
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
            All Contracts
          </button>
          <button
            onClick={() => { setStatus('PENDING'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === 'PENDING' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            Pending Reservations
          </button>
          <button
            onClick={() => { setStatus('ACTIVE'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === 'ACTIVE' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            Active Rentals
          </button>
          <button
            onClick={() => { setStatus('COMPLETED'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              status === 'COMPLETED' ? 'bg-accent-primary text-white' : 'text-fg-secondary bg-bg-inset border border-border-surface/20'
            }`}
          >
            Completed
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
          <span className="text-xs text-fg-tertiary font-bold tracking-wider">LOADING CONTRACTS...</span>
        </div>
      ) : rentals.length === 0 ? (
        <div className="text-center py-20 p-6 rounded-2xl border border-dashed border-border-surface/40 bg-bg-surface/10">
          <p className="text-sm font-bold text-fg-secondary">No contracts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rentals.map((r: any) => (
            <div key={r.id} className="p-5 rounded-2xl border border-border-surface/30 bg-bg-card/45 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-border-surface transition-all">
              
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-bg-inset border border-border-surface/40 p-1 flex items-center justify-center shrink-0">
                  <img
                    src={r.vehicle.photoUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400'}
                    alt={r.vehicle.model.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-fg-tertiary font-bold leading-none">#{r.id.substring(0, 8)}</span>
                    <h3 className="text-sm font-extrabold text-fg-main uppercase">
                      {r.vehicle.brand.name} {r.vehicle.model.name}
                    </h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-[10px] text-fg-tertiary mt-1.5 flex items-center gap-1 font-semibold uppercase">
                    <User className="w-3.5 h-3.5 text-accent-primary" />
                    Customer: <span className="text-fg-secondary font-bold">{r.customer.name}</span>
                  </p>
                  <p className="text-[10px] text-fg-tertiary mt-1.5 flex items-center gap-1 font-semibold uppercase">
                    <Calendar className="w-3.5 h-3.5 text-accent-primary" />
                    {new Date(r.rentalDate).toLocaleDateString()} — {new Date(r.scheduledReturnDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {r.status === 'PENDING' && (
                  <Button onClick={() => handleStartCheckout(r)} className="!h-8 text-[10px] uppercase font-bold tracking-widest px-4 rounded-lg flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5" />
                    Checkout
                  </Button>
                )}

                {r.status === 'ACTIVE' && (
                  <Button onClick={() => handleStartReturn(r)} className="!h-8 text-[10px] uppercase font-bold tracking-widest px-4 rounded-lg bg-emerald-500 border border-emerald-500 hover:bg-emerald-600 flex items-center gap-1.5">
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    Return Vehicle
                  </Button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* 5-STEP RENTAL CHECKOUT STEPPER DIALOG */}
      {checkoutRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-inset/75 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card border border-border-surface/50 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative space-y-6">
            
            {checkoutStep !== 5 && (
              <button
                onClick={() => setCheckoutRental(null)}
                className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer"
              >
                ✕
              </button>
            )}

            <div>
              <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">Checkout Contract Desk</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-1 uppercase">
                {checkoutStep === 1 && '1. Verify Reservation'}
                {checkoutStep === 2 && "2. Check Driver's License"}
                {checkoutStep === 3 && '3. Check Odometer & Fuel'}
                {checkoutStep === 4 && '4. Draw Customer Signature'}
                {checkoutStep === 5 && 'Checkout Activated!'}
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
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">Customer Name</td><td className="py-2 text-fg-main font-bold">{checkoutRental.customer.name}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">Vehicle Assigned</td><td className="py-2 text-fg-main font-bold">{checkoutRental.vehicle.brand.name} {checkoutRental.vehicle.model.name}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">Plate Number</td><td className="py-2 text-fg-main font-bold font-mono">{checkoutRental.vehicle.plateNumber}</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 text-fg-tertiary">Rental dates</td><td className="py-2 text-fg-main">{new Date(checkoutRental.rentalDate).toLocaleDateString()} — {new Date(checkoutRental.scheduledReturnDate).toLocaleDateString()}</td></tr>
                  </tbody>
                </table>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutRental(null)}>Cancel</Button>
                  <Button onClick={() => setCheckoutStep(2)}>Next: Verify Credentials</Button>
                </div>
              </div>
            )}

            {/* Step 2: License check */}
            {checkoutStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-inset border border-border-surface/40 space-y-3">
                  <span className="text-[10px] text-fg-tertiary font-bold block uppercase leading-none">Registered Credentials</span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-fg-tertiary block text-[10px]">License Number</span>
                      <span className="text-fg-main font-bold font-mono">{checkoutRental.customer.licenseNumber}</span>
                    </div>
                    <div>
                      <span className="text-fg-tertiary block text-[10px]">Expiration Date</span>
                      <span className={`font-bold ${new Date(checkoutRental.customer.licenseExpDate) < new Date() ? 'text-accent-error' : 'text-emerald-500'}`}>
                        {new Date(checkoutRental.customer.licenseExpDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-fg-tertiary block text-[10px]">National ID / Passport</span>
                      <span className="text-fg-main font-bold">{checkoutRental.customer.nationalId}</span>
                    </div>
                    <div>
                      <span className="text-fg-tertiary block text-[10px]">Profile Status</span>
                      <span className="text-emerald-500 font-bold uppercase">{checkoutRental.customer.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutStep(1)}>Back</Button>
                  <Button onClick={handleNextCheckoutStep}>Next: Vehicle Odometer</Button>
                </div>
              </div>
            )}

            {/* Step 3: Odometer & Fuel Check */}
            {checkoutStep === 3 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-white/5 bg-bg-inset text-[10px] text-fg-tertiary">
                  Current vehicle odometer log: <strong>{checkoutRental.vehicle.odometer} km</strong>. Confirm keys checkout details below.
                </div>

                <FormField label="Current Checkout Odometer (km)" required>
                  <Input
                    type="number"
                    value={checkoutOdometer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCheckoutOdometer(Number(e.target.value))}
                    className="!h-9 rounded-lg"
                  />
                </FormField>

                <FormField label="Checkout Fuel Level" required>
                  <select
                    value={checkoutFuelLevel}
                    onChange={(e) => setCheckoutFuelLevel(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                  >
                    <option value="FULL">FULL</option>
                    <option value="THREE_QUARTERS">THREE QUARTERS</option>
                    <option value="HALF">HALF</option>
                    <option value="QUARTER">QUARTER</option>
                    <option value="EMPTY">EMPTY</option>
                  </select>
                </FormField>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutStep(2)}>Back</Button>
                  <Button onClick={handleNextCheckoutStep}>Next: Signature</Button>
                </div>
              </div>
            )}

            {/* Step 4: Draw Hand Signature */}
            {checkoutStep === 4 && (
              <div className="space-y-4">
                <span className="text-xs font-semibold text-fg-secondary block">Collect Customer physical signature on checkout contract terms:</span>
                <SignaturePad onChange={setCheckoutSignature} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setCheckoutStep(3)}>Back</Button>
                  <Button
                    onClick={handleConfirmCheckout}
                    isLoading={createRentalMutation.isPending}
                    disabled={!checkoutSignature}
                  >
                    Authorize Checkout
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
                  <h3 className="text-base font-extrabold text-fg-main uppercase tracking-wider">Checkout Complete</h3>
                  <p className="text-xs text-fg-secondary max-w-sm">
                    Vehicle status is now set to <strong>RENTED</strong>. The rental contract contract has successfully initiated. Hand the keys to the customer!
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button className="w-full" onClick={() => setCheckoutRental(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* RENTAL RETURN CHECK-IN DIALOG */}
      {returnRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-inset/75 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card border border-border-surface/50 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative space-y-6">
            
            {returnStep !== 4 && (
              <button
                onClick={() => setReturnRental(null)}
                className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer"
              >
                ✕
              </button>
            )}

            <div>
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block font-sans">Return check-in desk</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-1 uppercase">
                {returnStep === 1 && '1. Check-in Parameters'}
                {returnStep === 2 && '2. Penalty Breakdown'}
                {returnStep === 3 && '3. Draw Return Signature'}
                {returnStep === 4 && 'Return Finalized!'}
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
                <div className="p-3 rounded-xl bg-bg-inset text-[10px] text-fg-tertiary">
                  Checkout details: Odometer <strong>{returnRental.checkoutOdometer} km</strong>. Fuel Level: <strong>{returnRental.checkoutFuelLevel}</strong>.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Return Odometer (km)" required>
                    <Input
                      type="number"
                      value={returnOdometer}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReturnOdometer(Number(e.target.value))}
                      className="!h-9 rounded-lg"
                    />
                  </FormField>

                  <FormField label="Return Fuel Level" required>
                    <select
                      value={returnFuelLevel}
                      onChange={(e) => setReturnFuelLevel(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
                    >
                      <option value="FULL">FULL</option>
                      <option value="THREE_QUARTERS">THREE QUARTERS</option>
                      <option value="HALF">HALF</option>
                      <option value="QUARTER">QUARTER</option>
                      <option value="EMPTY">EMPTY</option>
                    </select>
                  </FormField>
                </div>

                <div className="p-4 rounded-xl border border-border-surface/30 space-y-3 bg-bg-surface/10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent-primary block">Inspect Damage / Incidents</span>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasBrokenGlass}
                        onChange={(e) => setHasBrokenGlass(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                      />
                      Broken Glass
                    </label>

                    <label className="flex items-center gap-2 text-fg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasNewScratches}
                        onChange={(e) => setHasNewScratches(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border border-border-surface/40 accent-accent-primary"
                      />
                      New Scratches
                    </label>
                  </div>

                  <FormField label="Damaged / Missing Tires Count">
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
                  <Button variant="secondary" onClick={() => setReturnRental(null)}>Cancel</Button>
                  <Button
                    onClick={handleEstimateReturn}
                    isLoading={estimateReturnMutation.isPending}
                    className="flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Estimate Penalty Fees
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Live breakdown estimates */}
            {returnStep === 2 && estimateData && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-bg-inset border border-border-surface/40 space-y-2 text-xs">
                  <div className="flex justify-between text-fg-tertiary">
                    <span>Base Rental Contract Cost</span>
                    <span className="font-mono text-fg-main font-semibold">${estimateData.baseCost.toFixed(2)}</span>
                  </div>
                  {estimateData.lateFee > 0 && (
                    <div className="flex justify-between text-accent-error">
                      <span>Late Return fee ({estimateData.lateHours.toFixed(1)} hrs late)</span>
                      <span className="font-mono font-bold">${estimateData.lateFee.toFixed(2)}</span>
                    </div>
                  )}
                  {estimateData.fuelFee > 0 && (
                    <div className="flex justify-between text-accent-error">
                      <span>Refueling Penalty ({estimateData.fuelDifference} steps missing)</span>
                      <span className="font-mono font-bold">${estimateData.fuelFee.toFixed(2)}</span>
                    </div>
                  )}
                  {estimateData.totalDamageFee > 0 && (
                    <div className="flex justify-between text-accent-error">
                      <span>Inspection Damage Penalty</span>
                      <span className="font-mono font-bold">${estimateData.totalDamageFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-fg-main border-t border-white/10 pt-2.5">
                    <span>Final Contract Cost:</span>
                    <span className="font-mono">${estimateData.totalFinalCost.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setReturnStep(1)}>Back</Button>
                  <Button onClick={() => setReturnStep(3)}>Next: Return Signature</Button>
                </div>
              </div>
            )}

            {/* Step 3: Draw Hand Signature return */}
            {returnStep === 3 && (
              <div className="space-y-4">
                <span className="text-xs font-semibold text-fg-secondary block">Collect Customer physical signature on final check-in invoice:</span>
                <SignaturePad onChange={setReturnSignature} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setReturnStep(2)}>Back</Button>
                  <Button
                    onClick={handleConfirmReturn}
                    isLoading={returnRentalMutation.isPending}
                    disabled={!returnSignature}
                  >
                    Confirm Return Check-In
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
                  <h3 className="text-base font-extrabold text-fg-main uppercase tracking-wider">Return Finalized</h3>
                  <p className="text-xs text-fg-secondary max-w-sm">
                    Pre-auth hold has been captured. Vehicle status is now set to <strong>UNDER INSPECTION</strong> or <strong>MAINTENANCE</strong> and needs a physical detail checklist audit.
                  </p>
                </div>

                <div className="pt-4 w-full">
                  <Button className="w-full" onClick={() => setReturnRental(null)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* WALK-IN DIALOG OVERLAY */}
      {isWalkinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-inset/75 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card border border-border-surface/50 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative space-y-5 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsWalkinOpen(false)}
              className="absolute top-5 right-5 text-fg-tertiary hover:text-fg-main cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-[9px] font-bold text-accent-primary uppercase tracking-widest block">Counter Desk</span>
              <h2 className="text-lg font-extrabold text-fg-main mt-0.5 uppercase">Counter Walk-In Rental</h2>
            </div>

            {walkinError && (
              <div className="p-2.5 rounded-lg bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold">
                {walkinError}
              </div>
            )}

            <form onSubmit={handleCreateWalkin} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Select Active Customer" required>
                  <select
                    value={walkinCustomer}
                    onChange={(e) => setWalkinCustomer(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none"
                    required
                  >
                    <option value="">Choose Customer</option>
                    {activeCustomers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Select Available Vehicle" required>
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
                    <option value="">Choose Car</option>
                    {availableVehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.brand.name} {v.model.name} ({v.plateNumber})</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Rental Start Date" required>
                  <Input
                    type="date"
                    value={walkinStart}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinStart(e.target.value)}
                    className="!h-9 rounded-lg"
                    required
                  />
                </FormField>

                <FormField label="Scheduled Return Date" required>
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
                <FormField label="Starting Odometer (km)" required>
                  <Input
                    type="number"
                    value={walkinOdometer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalkinOdometer(Number(e.target.value))}
                    className="!h-9 rounded-lg"
                    required
                  />
                </FormField>

                <FormField label="Starting Fuel" required>
                  <select
                    value={walkinFuel}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWalkinFuel(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none"
                  >
                    <option value="FULL">FULL</option>
                    <option value="THREE_QUARTERS">THREE QUARTERS</option>
                    <option value="HALF">HALF</option>
                    <option value="QUARTER">QUARTER</option>
                    <option value="EMPTY">EMPTY</option>
                  </select>
                </FormField>

                <FormField label="Daily Rate ($)" required>
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
                <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest block mb-2">Credit Card Details (Authorization)</span>
                <StripeCardForm onCardComplete={setWalkinCardToken} />
              </div>

              <div className="border-t border-border-surface/15 pt-4">
                <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest block mb-2">Customer hand checkout Signature</span>
                <SignaturePad onChange={setWalkinSignature} />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-surface/15">
                <Button type="button" variant="secondary" onClick={() => setIsWalkinOpen(false)}>Cancel</Button>
                <Button
                  type="submit"
                  isLoading={createRentalMutation.isPending}
                  disabled={!walkinCardToken || !walkinSignature}
                >
                  Create Walk-In Contract
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
