import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getImageProxyUrl } from '../../Infrastructure/hooks/useUploads.js';
import { apiClient } from '../../Infrastructure/api-client.js';
import { useOwnReservations, useCancelReservation } from '../../Infrastructure/hooks/useReservations.js';
import { FormModal } from '../components/ui/FormModal.js';
import { StatusBadge } from '../components/ui/StatusBadge.js';
import { Button } from '../components/ui/Button.js';
import { Calendar, Trash2, ShieldAlert, FileText, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@rent-car/common';

export const MyRentalsPage: React.FC = () => {
  const { t } = useTranslation();

  // Filters
  const [statusFilter, setStatusFilter] = useState('');

  // Queries & Mutations
  const { data: bookings = [], isLoading, refetch } = useOwnReservations(statusFilter || undefined);
  const cancelMutation = useCancelReservation();

  // Cancellation Modal state
  const [cancellingBooking, setCancellingBooking] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile status check
  const [profile, setProfile] = useState<any | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient('/api/customers/me');
        if (res.data) {
          setProfile(res.data);
        }
      } catch (err) {
        console.error('Failed to load profile for verification:', err);
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const isProfileComplete = !!(
    profile?.nationalId &&
    profile?.licenseNumber &&
    profile?.licenseCountry &&
    profile?.licenseExpDate
  );

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
      setErrorMsg(err.message || t('common.operationFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
        <span className="text-xs text-fg-tertiary font-bold tracking-wider">{t('myRentals.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main uppercase">
          {t('myRentals.title')}
        </h2>
        <p className="text-xs text-fg-secondary mt-1">
          {t('myRentals.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <div />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-40 h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value="PENDING">{t('common.pending')}</option>
          <option value="ACTIVE">{t('common.active')}</option>
          <option value="COMPLETED">{t('common.completed')}</option>
          <option value="CANCELLED">{t('common.cancelled')}</option>
        </select>
      </div>

      {!isProfileLoading && !isProfileComplete && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md text-amber-200 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 animate-pulse" />
            <span>{t('auth.profileIncompleteNotice')}</span>
          </div>
          <Link
            to="/customer/profile"
            className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors shrink-0"
          >
            {t('auth.completeProfileLink')} &rarr;
          </Link>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-20 p-6 rounded-2xl border border-dashed border-border-surface/40 bg-bg-surface/10">
          <p className="text-sm font-bold text-fg-secondary">{t('myRentals.noReservations')}</p>
          <p className="text-xs text-fg-tertiary mt-1">{t('myRentals.browsePrompt')}</p>
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
                      src={getImageProxyUrl(booking.vehicle.imageUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400')}
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
                    
                    <p className="text-xs text-fg-tertiary mt-1.5 flex items-center gap-1 font-semibold uppercase">
                      <Calendar className="w-3 h-3 text-accent-primary" />
                      {new Date(booking.rentalDate).toLocaleDateString()} — {new Date(booking.scheduledReturnDate).toLocaleDateString()}
                    </p>

                    <div className="flex gap-4 mt-2">
                      <span className="text-xs text-fg-secondary font-bold font-mono">
                        {t('myRentals.plate')} <span className="text-fg-main">{booking.vehicle.plateNumber}</span>
                      </span>
                      <span className="text-xs text-fg-secondary font-bold font-mono">
                        {t('myRentals.totalCharge')} <span className="text-fg-main">{formatCurrency(booking.totalCost || 0)}</span>
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
                      className="!h-8 text-xs uppercase font-bold tracking-widest px-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 inline" />
                      {t('myRentals.cancelBooking')}
                    </Button>
                  )}

                  {booking.status === 'COMPLETED' && (
                    <Button
                      variant="secondary"
                      className="!h-8 text-xs uppercase font-bold tracking-widest px-3 rounded-lg flex items-center gap-1"
                      onClick={() => alert('Downloading PDF contract... (Functionality stub)')}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {t('myRentals.contractPdf')}
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
        <FormModal isOpen={!!cancellingBooking} onClose={() => setCancellingBooking(null)} title={t('myRentals.cancelTitle')}>
          <div className="flex items-center gap-3 text-red-500 mb-4">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <span className="text-sm font-bold uppercase text-fg-main">{t('myRentals.cancelTitle')}</span>
          </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-accent-error/15 border border-accent-error/20 text-accent-error text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <p className="text-xs text-fg-secondary">
              {t('myRentals.cancelQuestion')}{' '}
              <strong className="text-fg-main uppercase">
                {cancellingBooking.vehicle.brand.name} {cancellingBooking.vehicle.model.name}
              </strong>
              ?
            </p>

            {checkLateCancellation(cancellingBooking.rentalDate) ? (
              <div className="p-3 rounded-xl border border-red-500/25 bg-red-500/5 text-xs text-fg-secondary">
                <span className="font-bold text-red-500 block uppercase mb-1">{t('myRentals.lateFeeWarning')}</span>
                {t('myRentals.lateFeeDesc', { price: formatCurrency(cancellingBooking.pricePerDay) })}
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 text-xs text-fg-secondary">
                <span className="font-bold text-emerald-500 block uppercase mb-1">{t('myRentals.freeCancellation')}</span>
                {t('myRentals.freeCancelDesc')}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCancellingBooking(null)}>
                {t('myRentals.keepBooking')}
              </Button>
              <Button
                onClick={handleConfirmCancel}
                isLoading={cancelMutation.isPending}
                className="bg-red-500 border border-red-500 text-white hover:bg-red-600"
              >
                {t('myRentals.confirmCancel')}
              </Button>
            </div>

        </FormModal>
      )}

    </div>
  );
};
export default MyRentalsPage;
