import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompanyInfo, useUpdateCompanyInfo } from '../../Infrastructure/hooks/useCatalog.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { FormField } from '../components/ui/FormField.js';
import { Toast } from '../components/ui/Toast.js';

export const CompanySettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: company, isLoading } = useCompanyInfo();
  const updateMutation = useUpdateCompanyInfo();

  const [companyName, setCompanyName] = useState('');
  const [rnc, setRnc] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (company) {
      setCompanyName(company.companyName || '');
      setRnc(company.rnc || '');
      setAddress(company.address || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setWebsite(company.website || '');
      setCity(company.city || '');
      setLogoUrl(company.logoUrl || '');
    }
  }, [company]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        data: { companyName, rnc, address, phone, email, website: website || null, city, logoUrl: logoUrl || null },
      });
      setToast({ message: t('companySettings.savedSuccess'), type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || t('companySettings.saveFailed'), type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <PageHeader
        title={t('companySettings.title')}
        description={t('companySettings.subtitle')}
      />

      <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-xl">
        <FormField label={t('companySettings.companyName')} required>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
            required
          />
        </FormField>

        <FormField label={t('companySettings.rnc')} required>
          <input
            type="text"
            value={rnc}
            onChange={(e) => setRnc(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
            required
          />
        </FormField>

        <FormField label={t('companySettings.address')} required>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
            required
          />
        </FormField>

        <FormField label={t('companySettings.phone')} required>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
            required
          />
        </FormField>

        <FormField label={t('companySettings.email')} required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
            required
          />
        </FormField>

        <FormField label={t('companySettings.website')}>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
            placeholder="https://"
          />
        </FormField>

        <FormField label={t('companySettings.city')} required>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
            required
          />
        </FormField>

        <FormField label={t('companySettings.logoUrl')}>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="w-full text-xs min-h-[44px] px-3 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all"
            placeholder="https://"
          />
        </FormField>

        <div className="flex justify-end mt-4">
          <Button variant="primary" type="submit" isLoading={updateMutation.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>

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

export default CompanySettingsPage;
