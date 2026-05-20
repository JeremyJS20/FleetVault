import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoginSchema, type LoginInput } from '@rent-car/common';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { ShieldAlert } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setLoading(true);
    try {
      const loggedInUser = await login(data.email, data.password);
      const isStaff = loggedInUser?.role === 'ADMINISTRATOR' || loggedInUser?.role === 'AGENT' || loggedInUser?.role === 'INSPECTOR';
      if (isStaff) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main">
          {t('auth.signIn')}
        </h2>
        <p className="text-xs text-fg-secondary">
          {t('auth.enterCredentials')}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
          <ShieldAlert size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label={t('auth.emailAddress')}
          required
          error={errors.email?.message}
        >
          <Input
            type="email"
            placeholder="admin@fleetvault.com or customer@fleetvault.com"
            {...register('email')}
          />
        </FormField>

        <FormField
          label={t('auth.password')}
          required
          error={errors.password?.message}
        >
          <Input
            type="password"
            placeholder="••••••••"
            {...register('password')}
          />
        </FormField>

        <Button
          type="submit"
          className="w-full h-12 text-sm mt-2"
          isLoading={loading}
        >
          {t('auth.continue')}
        </Button>
      </form>

      <div className="text-center pt-2">
        <span className="text-xs text-fg-tertiary">
          {t('auth.dontHaveAccount')}{' '}
          <Link
            to="/register"
            className="text-accent-primary font-semibold hover:underline"
          >
            {t('auth.createAccount')}
          </Link>
        </span>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-bg-inset border border-border-surface/40 text-[10px] font-mono text-fg-secondary space-y-1">
        <div className="font-bold text-accent-primary">Development Logins:</div>
        <div>Admin: <span className="text-fg-main">admin@example.com</span> (pw: 6+ chars)</div>
        <div>Customer: <span className="text-fg-main">customer@example.com</span> (pw: 6+ chars)</div>
      </div>
    </div>
  );
};

export default LoginPage;
