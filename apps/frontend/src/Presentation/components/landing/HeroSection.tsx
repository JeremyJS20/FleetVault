import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown } from 'lucide-react';
import { getImageProxyUrl } from '../../../Infrastructure/hooks/useUploads.js';

const HERO_VEHICLE_IMG = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800';

export const HeroSection: React.FC = () => {
  const { t } = useTranslation();

  const scrollToCatalog = () => {
    const el = document.getElementById('vehicle-catalog');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-8 md:py-16">
      <div className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left column — text */}
          <div className="flex flex-col gap-5 animate-slide-up">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent-primary/20 bg-accent-primary/5 text-[11px] font-bold text-accent-primary uppercase tracking-widest w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
              {t('landing.badge')}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.05] tracking-tight">
              <span className="bg-gradient-to-r from-accent-primary to-accent-primary-end bg-clip-text text-transparent">
                {t('landing.headline')}
              </span>
              <br />
              <span className="text-fg-main">
                {t('landing.headlineSub')}
              </span>
            </h1>

            <p className="text-sm md:text-base text-fg-secondary max-w-lg leading-relaxed">
              {t('landing.subtitle')}
            </p>

            <div>
              <button
                onClick={scrollToCatalog}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-primary to-accent-primary-end text-fg-on-accent font-bold text-sm tracking-wider uppercase hover:shadow-lg hover:shadow-accent-primary/20 transition-all duration-300 cursor-pointer"
              >
                {t('landing.ctaPrimary')}
                <ArrowDown size={16} />
              </button>
            </div>
          </div>

          {/* Right column — vehicle image */}
          <div className="hidden lg:flex items-center justify-center animate-fade-in">
            <div className="relative w-full max-w-lg">
              <div className="relative rounded-3xl bg-bg-card/40 border border-border-surface/20 backdrop-blur-xl p-6 rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent-primary/5 to-transparent pointer-events-none" />
                <img
                  src={getImageProxyUrl(HERO_VEHICLE_IMG)}
                  alt="Premium vehicle"
                  className="w-full h-auto object-contain drop-shadow-2xl animate-float"
                />
                <div className="absolute -bottom-3 -right-3 px-4 py-2 rounded-2xl bg-bg-card/80 border border-border-surface/30 backdrop-blur-md shadow-lg">
                  <span className="text-xs font-bold text-accent-primary font-mono tracking-wider">
                    {t('landing.fromPrice')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
