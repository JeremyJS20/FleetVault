import React, { useState } from 'react';
import { useOwnReservations, useCancelReservation } from '../../Infrastructure/hooks/useReservations.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { Calendar, Trash2, ShieldAlert, FileText } from 'lucide-react';

export const MyRentalsPage: React.FC = () => {

  // Queries & Mutations
  const { data: bookings = [], isLoading, refetch } = useOwnReservations();
  const cancelMutation = useCancelReservation();

  // Cancellation Modal state
  const [cancellingBooking, setCancellingBooking] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkLateCancellation = (rentalDateStr: string) => {
    const rentalDate = new Date(rentalDateStr);
    const now = new Date();
    const hoursToStart = (rentalDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursToStart < 24.0;
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    try {
      setErrorMsg(null);
      await cancelMutation.mutateAsync(cancellingBooking.id);
      setCancellingBooking(null);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel the booking. Please contact support.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
        <span className="text-xs text-fg-tertiary font-bold tracking-wider">LOADING BOOKINGS...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main uppercase">
          My Reservations & Contracts
        </h2>
        <p className="text-xs text-fg-secondary mt-1">
          Review your upcoming rentals, billing ledgers, and download signed contracts.
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-20 p-6 rounded-2xl border border-dashed border-border-surface/40 bg-bg-surface/10">
          <p className="text-sm font-bold text-fg-secondary">No reservations found</p>
          <p className="text-xs text-fg-tertiary mt-1">Head over to the vehicle search page to book your first car!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => {
            return (
              <div key={booking.id} className="p-5 rounded-2xl border border-border-surface/30 bg-bg-card/45 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-border-surface transition-all">
                
                {/* Visual Details */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-bg-inset border border-border-surface/40 p-2 flex items-center justify-center shrink-0">
                    <img
                      src={booking.vehicle.photoUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400'}
                      alt={booking.vehicle.model.name}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-fg-main uppercase">
                        {booking.vehicle.brand.name} {booking.vehicle.model.name}
                      </h3>
                      <StatusBadge status={booking.status} />
                    </div>
                    
                    <p className="text-[10px] text-fg-tertiary mt-1.5 flex items-center gap-1 font-semibold uppercase">
                      <Calendar className="w-3 h-3 text-accent-primary" />
                      {new Date(booking.rentalDate).toLocaleDateString()} — {new Date(booking.scheduledReturnDate).toLocaleDateString()}
                    </p>

                    <div className="flex gap-4 mt-2">
                      <span className="text-[10px] text-fg-secondary font-bold font-mono">
                        Plate: <span className="text-fg-main">{booking.vehicle.plateNumber}</span>
                      </span>
                      <span className="text-[10px] text-fg-secondary font-bold font-mono">
                        Total Charge: <span className="text-fg-main">${booking.totalCost?.toFixed(2) || '0.00'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 self-stretch md:self-auto justify-end">
                  {booking.status === 'PENDING' && (
                    <Button
                      variant="secondary"
                      onClick={() => setCancellingBooking(booking)}
                      className="!h-8 text-[10px] uppercase font-bold tracking-widest px-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 inline" />
                      Cancel Booking
                    </Button>
                  )}

                  {booking.status === 'COMPLETED' && (
                    <Button
                      variant="secondary"
                      className="!h-8 text-[10px] uppercase font-bold tracking-widest px-3 rounded-lg flex items-center gap-1"
                      onClick={() => alert('Downloading PDF contract... (Functionality stub)')}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Contract PDF
                    </Button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Warning Modal dialog */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-inset/75 backdrop-blur-md animate-fade-in">
          <div className="bg-bg-card border border-border-surface/50 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-extrabold uppercase">Confirm Cancellation</h3>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-fg-secondary">
              Are you sure you want to cancel your reservation for the{' '}
              <strong className="text-fg-main uppercase">
                {cancellingBooking.vehicle.brand.name} {cancellingBooking.vehicle.model.name}
              </strong>
              ?
            </p>

            {checkLateCancellation(cancellingBooking.rentalDate) ? (
              <div className="p-3 rounded-xl border border-red-500/25 bg-red-500/5 text-[10px] text-fg-secondary">
                <span className="font-bold text-red-500 block uppercase mb-1">Warning: Late Cancellation Fee Applies</span>
                Because this cancellation is requested <strong className="text-fg-main">less than 24 hours</strong> before the scheduled pickup, you will be charged a penalty fee of 1 full day of the rental rate (<strong>${cancellingBooking.pricePerDay.toFixed(2)}</strong>) captured from your pre-authorized card.
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 text-[10px] text-fg-secondary">
                <span className="font-bold text-emerald-500 block uppercase mb-1">Free Cancellation Available</span>
                Your cancellation notice is more than 24 hours. Your Stripe card pre-authorization hold will be released immediately with <strong>no fees charged</strong>.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCancellingBooking(null)}>
                Keep Booking
              </Button>
              <Button
                onClick={handleConfirmCancel}
                isLoading={cancelMutation.isPending}
                className="bg-red-500 border border-red-500 text-white hover:bg-red-600"
              >
                Confirm Cancel
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default MyRentalsPage;
