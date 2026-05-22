import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Infrastructure/auth.context.js';
import { apiClient } from '../../Infrastructure/api-client.js';

export const MagicLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError(t('auth.magicLinkInvalid'));
      return;
    }

    (async () => {
      try {
        const res = await apiClient('/api/auth/magic-login', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });

        const user = await login(res.data.accessToken, res.data.user, res.data.refreshToken);
        const isStaff = user?.role === 'ADMINISTRATOR' || user?.role === 'AGENT' || user?.role === 'INSPECTOR';
        if (isStaff) {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch (err: any) {
        setStatus('error');
        setError(err.message || t('auth.magicLinkFailed'));
      }
    })();
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
        <div className="max-w-md w-full p-6 rounded-3xl border border-border-surface/40 bg-bg-card/70 backdrop-blur-xl space-y-4 text-center">
          <h2 className="text-lg font-extrabold text-fg-main uppercase">{t('auth.signInFailed')}</h2>
          <p className="text-xs text-fg-secondary">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-primary-end text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all"
          >
            {t('common.goHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary/20 border-t-accent-primary animate-spin" />
        <span className="text-xs text-fg-tertiary font-bold tracking-wider">{t('auth.signingIn')}</span>
      </div>
    </div>
  );
};

export default MagicLoginPage;
