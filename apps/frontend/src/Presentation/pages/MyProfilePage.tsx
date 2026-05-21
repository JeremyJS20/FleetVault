import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { apiClient } from '../../Infrastructure/api-client.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { User, Shield, Check, AlertCircle } from 'lucide-react';

export const MyProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseCountry, setLicenseCountry] = useState('');
  const [licenseExpDate, setLicenseExpDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [type, setType] = useState('REGULAR');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient('/api/customers/me');
        if (res.data) {
          const c = res.data;
          setName(c.name || '');
          setNationalId(c.nationalId || '');
          setPhone(c.phone || '');
          setAddress(c.address || '');
          setLicenseNumber(c.licenseNumber || '');
          setLicenseCountry(c.licenseCountry || '');
          if (c.licenseExpDate) {
            setLicenseExpDate(new Date(c.licenseExpDate).toISOString().split('T')[0]);
          }
          setStatus(c.status || 'ACTIVE');
          setType(c.type || 'REGULAR');
        }
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        setError('Failed to load your customer profile. Please make sure you have registered your profile.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setSuccess(false);
      setError(null);

      await apiClient('/api/customers/me', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          nationalId,
          phone,
          address,
          licenseNumber,
          licenseCountry,
          licenseExpDate: new Date(licenseExpDate).toISOString(),
          status,
          type
        })
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please verify your fields.');
    } finally {
      setIsSaving(false);
    }
  };

  const isProfileComplete = !!(nationalId && licenseNumber && licenseCountry && licenseExpDate);

  const scrollToForm = () => {
    const element = document.getElementById('profile-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      const input = document.getElementById('nationalId-input');
      if (input) input.focus();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
        <span className="text-xs text-fg-tertiary font-bold tracking-wider">LOADING PROFILE...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main uppercase">
          Profile Settings
        </h2>
        <p className="text-xs text-fg-secondary mt-1">
          View and edit your personal information and driver credentials.
        </p>
      </div>

      {!isProfileComplete && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md text-amber-200 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 animate-pulse" />
            <span>{t('auth.profileIncompleteNotice')}</span>
          </div>
          <button
            type="button"
            onClick={scrollToForm}
            className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors cursor-pointer shrink-0"
          >
            {t('auth.completeProfileLink')} &rarr;
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-accent-error/10 border border-accent-error/20 text-accent-error text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          Profile updated successfully!
        </div>
      )}

      <form id="profile-form" onSubmit={handleSubmit} className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-6">
        <div className="flex items-center gap-4 pb-4 border-b border-border-surface/20">
          <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-fg-main uppercase leading-none">{name || user?.name}</h3>
            <span className="text-[10px] text-fg-tertiary font-semibold block mt-1.5 uppercase">
              Account status: <span className={status === 'ACTIVE' ? 'text-emerald-500' : 'text-accent-error'}>{status}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Full Name" required>
            <Input
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="!h-9 rounded-lg"
              required
            />
          </FormField>

          <FormField label="National ID / Passport" required>
            <Input
              id="nationalId-input"
              type="text"
              value={nationalId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNationalId(e.target.value)}
              placeholder="e.g. ID-12345678"
              className="!h-9 rounded-lg"
              required
            />
          </FormField>

          <FormField label="Phone Number" required>
            <Input
              type="tel"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
              placeholder="e.g. +1 555-0199"
              className="!h-9 rounded-lg"
              required
            />
          </FormField>

          <FormField label="Address" required>
            <Input
              type="text"
              value={address}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
              placeholder="e.g. 123 Luxury Ave, CA"
              className="!h-9 rounded-lg"
              required
            />
          </FormField>
        </div>

        <div className="p-4 rounded-xl bg-bg-inset border border-border-surface/40 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-primary flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Driving Credentials
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Driver's License Number" required>
              <Input
                type="text"
                value={licenseNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLicenseNumber(e.target.value)}
                placeholder="e.g. DL-987654321"
                className="!h-9 rounded-lg bg-bg-surface/50"
                required
              />
            </FormField>

            <FormField label="License Country" required>
              <Input
                type="text"
                value={licenseCountry}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLicenseCountry(e.target.value)}
                placeholder="e.g. United States"
                className="!h-9 rounded-lg bg-bg-surface/50"
                required
              />
            </FormField>

            <FormField label="License Expiry Date" required>
              <Input
                type="date"
                value={licenseExpDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLicenseExpDate(e.target.value)}
                className="!h-9 rounded-lg bg-bg-surface/50"
                required
              />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSaving} className="px-6">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};
export default MyProfilePage;
