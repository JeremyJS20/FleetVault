import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { CustomerRegisterSchema, type CustomerRegisterInput } from '@rent-car/common';
import { useAuth } from '@/Infrastructure/auth.context.js';
import { ShieldAlert, UserPlus } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const fullName = `${data.firstName} ${data.lastName}`;
      await authRegister(fullName, data.email, data.password);
      navigate('/customer/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main">
          Create Account
        </h2>
        <p className="text-xs text-fg-secondary">
          Register to browse and reserve premium vehicles
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
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              {...register('email')}
              className={`w-full px-4 py-2.5 rounded-xl bg-bg-inset border text-xs text-fg-main focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
                errors.email ? 'border-red-500/50' : 'border-border-surface/60'
              }`}
            />
            {errors.email && (
              <p className="text-[9px] text-red-500 font-semibold">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className={`w-full px-4 py-2.5 rounded-xl bg-bg-inset border text-xs text-fg-main focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
                errors.password ? 'border-red-500/50' : 'border-border-surface/60'
              }`}
            />
            {errors.password && (
              <p className="text-[9px] text-red-500 font-semibold">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
              First Name
            </label>
            <input
              type="text"
              placeholder="John"
              {...register('firstName')}
              className={`w-full px-4 py-2.5 rounded-xl bg-bg-inset border text-xs text-fg-main focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
                errors.firstName ? 'border-red-500/50' : 'border-border-surface/60'
              }`}
            />
            {errors.firstName && (
              <p className="text-[9px] text-red-500 font-semibold">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
              Last Name
            </label>
            <input
              type="text"
              placeholder="Doe"
              {...register('lastName')}
              className={`w-full px-4 py-2.5 rounded-xl bg-bg-inset border text-xs text-fg-main focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
                errors.lastName ? 'border-red-500/50' : 'border-border-surface/60'
              }`}
            />
            {errors.lastName && (
              <p className="text-[9px] text-red-500 font-semibold">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
              National ID
            </label>
            <input
              type="text"
              placeholder="ID Number"
              {...register('nationalId')}
              className={`w-full px-4 py-2.5 rounded-xl bg-bg-inset border text-xs text-fg-main focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
                errors.nationalId ? 'border-red-500/50' : 'border-border-surface/60'
              }`}
            />
            {errors.nationalId && (
              <p className="text-[9px] text-red-500 font-semibold">{errors.nationalId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
              Phone Number (Optional)
            </label>
            <input
              type="text"
              placeholder="+1 (555) 123-4567"
              {...register('phone')}
              className="w-full px-4 py-2.5 rounded-xl bg-bg-inset border border-border-surface/60 text-xs text-fg-main focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-bg-inset border border-border-surface/40 space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent-primary block">
            Driver's License Details
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-fg-secondary">
                License Number
              </label>
              <input
                type="text"
                placeholder="D1234567"
                {...register('licenseNumber')}
                className={`w-full px-3 py-2 rounded-lg bg-bg-card border text-xs text-fg-main focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
                  errors.licenseNumber ? 'border-red-500/50' : 'border-border-surface/60'
                }`}
              />
              {errors.licenseNumber && (
                <p className="text-[8px] text-red-500 font-semibold">{errors.licenseNumber.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-fg-secondary">
                Country
              </label>
              <input
                type="text"
                placeholder="Country"
                {...register('licenseCountry')}
                className={`w-full px-3 py-2 rounded-lg bg-bg-card border text-xs text-fg-main focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
                  errors.licenseCountry ? 'border-red-500/50' : 'border-border-surface/60'
                }`}
              />
              {errors.licenseCountry && (
                <p className="text-[8px] text-red-500 font-semibold">{errors.licenseCountry.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-fg-secondary">
                Expiry Date
              </label>
              <input
                type="date"
                {...register('licenseExpDate')}
                className={`w-full px-3 py-2 rounded-lg bg-bg-card border text-xs text-fg-main focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
                  errors.licenseExpDate ? 'border-red-500/50' : 'border-border-surface/60'
                }`}
              />
              {errors.licenseExpDate && (
                <p className="text-[8px] text-red-500 font-semibold">{errors.licenseExpDate.message}</p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary h-12 flex items-center justify-center gap-2 text-sm mt-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <UserPlus size={16} />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2">
        <span className="text-xs text-fg-tertiary">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-accent-primary font-semibold hover:underline"
          >
            Sign In
          </Link>
        </span>
      </div>
    </div>
  );
};

export default RegisterPage;
