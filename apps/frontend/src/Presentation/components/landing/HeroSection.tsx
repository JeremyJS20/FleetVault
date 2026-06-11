import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, Shield, Clock, CreditCard } from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { t } = useTranslation();

  const scrollToCatalog = () => {
    const el = document.getElementById('vehicle-catalog');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden -mx-6 md:-mx-8 px-6 md:px-8">
      {/* Auroral glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-accent-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-accent-primary/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto gap-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent-primary/20 bg-accent-primary/5 text-[11px] font-bold text-accent-primary uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          {t('landing.badge')}
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight">
          <span className="bg-gradient-to-r from-accent-primary to-accent-primary-end bg-clip-text text-transparent">
            {t('landing.headline')}
          </span>
          <br />
          <span className="text-fg-main">
            {t('landing.headlineSub')}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm md:text-base text-fg-secondary max-w-2xl leading-relaxed">
          {t('landing.subtitle')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={scrollToCatalog}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-primary-end text-fg-on-accent font-bold text-sm tracking-wider uppercase hover:shadow-lg hover:shadow-accent-primary/20 transition-all duration-300 cursor-pointer"
          >
            {t('landing.ctaPrimary')}
            <ArrowDown size={16} />
          </button>
          <a
            href="/policies"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border-surface/40 text-fg-secondary font-semibold text-sm tracking-wider uppercase hover:bg-bg-inset hover:border-border-surface transition-all duration-300"
          >
            {t('landing.ctaSecondary')}
          </a>
        </div>

        {/* Stats / Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mt-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-bg-card/60 border border-border-surface/20 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-accent-primary/10 flex items-center justify-center shrink-0">
              <Shield size={18} className="text-accent-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-fg-main">{t('landing.statSecure')}</p>
              <p className="text-[11px] text-fg-tertiary">{t('landing.statSecureDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-bg-card/60 border border-border-surface/20 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-accent-primary/10 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-accent-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-fg-main">{t('landing.stat247')}</p>
              <p className="text-[11px] text-fg-tertiary">{t('landing.stat247Desc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-bg-card/60 border border-border-surface/20 backdrop-blur-sm">
            <div className="w-9 h-9 rounded-lg bg-accent-primary/10 flex items-center justify-center shrink-0">
              <CreditCard size={18} className="text-accent-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-fg-main">{t('landing.statPricing')}</p>
              <p className="text-[11px] text-fg-tertiary">{t('landing.statPricingDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
