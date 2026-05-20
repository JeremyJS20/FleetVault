import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { LoginSchema, type LoginInput } from '@rent-car/common';
import { useAuth } from '@/Infrastructure/auth.context.js';
import { ShieldAlert, LogIn } from 'lucide-react';

export const LoginPage: React.FC = () => {
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
      await login(data.email, data.password);
      const email = data.email.toLowerCase();
      if (email.includes('admin')) {
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
          Sign In
        </h2>
        <p className="text-xs text-fg-secondary">
          Enter your credentials to access your FleetVault account
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
          <ShieldAlert size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">
            Email Address
          </label>
          <input
            type="email"
            placeholder="admin@fleetvault.com or customer@fleetvault.com"
            {...register('email')}
            className={`w-full px-4 py-3 rounded-xl bg-bg-inset border text-sm text-fg-main placeholder:text-fg-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
              errors.email ? 'border-red-500/50' : 'border-border-surface/60'
            }`}
          />
          {errors.email && (
            <p className="text-[10px] text-red-500 font-semibold mt-0.5">
              {errors.email.message}
            </p>
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
            className={`w-full px-4 py-3 rounded-xl bg-bg-inset border text-sm text-fg-main placeholder:text-fg-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all ${
              errors.password ? 'border-red-500/50' : 'border-border-surface/60'
            }`}
          />
          {errors.password && (
            <p className="text-[10px] text-red-500 font-semibold mt-0.5">
              {errors.password.message}
            </p>
          )}
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
              <LogIn size={16} />
              <span>Continue</span>
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2">
        <span className="text-xs text-fg-tertiary">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-accent-primary font-semibold hover:underline"
          >
            Create an Account
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
