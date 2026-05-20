import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CustomerRegisterSchema, type CustomerRegisterInput } from '@rent-car/common';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { ShieldAlert } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from || null;
  const bookVehicleId = (location.state as any)?.bookVehicleId || null;

  const defaultExpDate = new Date();
  defaultExpDate.setFullYear(defaultExpDate.getFullYear() + 5);
  const formattedDefaultExpDate = defaultExpDate.toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerRegisterInput>({
    resolver: zodResolver(CustomerRegisterSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      nationalId: '',
      licenseNumber: '',
      licenseCountry: 'United States',
      licenseExpDate: formattedDefaultExpDate,
    },
  });

  const onSubmit = async (data: CustomerRegisterInput) => {
    setError(null);
    setLoading(true);
    try {
      await registerCustomer(data);
      if (from) {
        navigate(from, { state: { bookVehicleId }, replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main">
          {t('auth.createAccount')}
        </h2>
        <p className="text-xs text-fg-secondary">
          {t('auth.register')}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
          <ShieldAlert size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={t('auth.emailAddress')} required error={errors.email?.message}>
            <Input
              type="email"
              placeholder="name@example.com"
              {...register('email')}
            />
          </FormField>

          <FormField label={t('auth.password')} required error={errors.password?.message}>
            <Input
              type="password"
              placeholder="••••••••"
              {...register('password')}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={t('auth.firstName')} required error={errors.firstName?.message}>
            <Input
              type="text"
              placeholder="John"
              {...register('firstName')}
            />
          </FormField>

          <FormField label={t('auth.lastName')} required error={errors.lastName?.message}>
            <Input
              type="text"
              placeholder="Doe"
              {...register('lastName')}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={t('auth.nationalId')} required error={errors.nationalId?.message}>
            <Input
              type="text"
              placeholder="ID Number"
              {...register('nationalId')}
            />
          </FormField>

          <FormField label={t('auth.phone')}>
            <Input
              type="text"
              placeholder="+1 (555) 123-4567"
              {...register('phone')}
            />
          </FormField>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-inset border border-border-surface/40 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent-primary block">
            {t('auth.licenseDetails')}
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label={t('auth.licenseNumber')} required error={errors.licenseNumber?.message}>
              <Input
                type="text"
                placeholder="D1234567"
                {...register('licenseNumber')}
                className="!h-9 rounded-lg"
              />
            </FormField>

            <FormField label={t('auth.country')} required error={errors.licenseCountry?.message}>
              <Input
                type="text"
                placeholder="Country"
                {...register('licenseCountry')}
                className="!h-9 rounded-lg"
              />
            </FormField>

            <FormField label={t('auth.expiryDate')} required error={errors.licenseExpDate?.message}>
              <Input
                type="date"
                {...register('licenseExpDate')}
                className="!h-9 rounded-lg"
              />
            </FormField>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-sm mt-2"
          isLoading={loading}
        >
          {t('auth.createAccount')}
        </Button>
      </form>

      <div className="text-center pt-2">
        <span className="text-xs text-fg-tertiary">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link
            to="/login"
            className="text-accent-primary font-semibold hover:underline"
          >
            {t('auth.signIn')}
          </Link>
        </span>
      </div>
    </div>
  );
};

export default RegisterPage;
