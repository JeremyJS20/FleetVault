import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

export const PolicyListPage: React.FC = () => {
  const { t } = useTranslation();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['public-policies'],
    queryFn: async () => {
      const res = await fetch('/api/policies');
      if (!res.ok) throw new Error('Failed to fetch policies');
      const json = await res.json();
      return json.data as any[];
    },
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto animate-fade-in px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-fg-main uppercase tracking-tight">
          {t('rentalPolicy.publicTitle')}
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          {t('rentalPolicy.publicSubtitle')}
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md text-fg-secondary font-mono text-xs">
          {t('common.loading')}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {policies.map((policy: any) => (
            <div
              key={policy.id}
              className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-2"
            >
              <h2 className="text-sm font-bold text-fg-main uppercase tracking-wider">
                {policy.title}
              </h2>
              <p className="text-xs text-fg-secondary leading-relaxed whitespace-pre-line">
                {policy.content}
              </p>
            </div>
          ))}

          <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-2">
            <h2 className="text-sm font-bold text-fg-main uppercase tracking-wider">
              {t('rentalPolicy.termsTitle')}
            </h2>
            <p className="text-xs text-fg-secondary leading-relaxed whitespace-pre-line">
              {t('rentalPolicy.termsContent')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyListPage;
