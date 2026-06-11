import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, Shield, Clock, Star, CreditCard, Search, Calendar } from 'lucide-react';
import { Input } from '../ui/Input.js';
import { FormField } from '../ui/FormField.js';
import { Button } from '../ui/Button.js';
import { getImageProxyUrl } from '../../../Infrastructure/hooks/useUploads.js';

const HERO_VEHICLE_IMG = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800';

interface HeroSectionProps {
  dateFrom: string;
  dateTo: string;
  typeId: string;
  brandId: string;
  vehicleTypes: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onTypeIdChange: (v: string) => void;
  onBrandIdChange: (v: string) => void;
  onSearch: (e: React.FormEvent) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  dateFrom, dateTo, typeId, brandId,
  vehicleTypes, brands,
  onDateFromChange, onDateToChange, onTypeIdChange, onBrandIdChange, onSearch,
}) => {
  const { t } = useTranslation();

  const scrollToCatalog = () => {
    const el = document.getElementById('vehicle-catalog');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden -mx-6 md:-mx-8 px-6 md:px-8">
      {/* Auroral glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[5%] left-[10%] w-[700px] h-[700px] rounded-full bg-accent-primary/10 blur-[140px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[600px] h-[600px] rounded-full bg-accent-primary-end/8 blur-[120px]" />
        <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center gap-12 py-12">
        {/* Top section: text left + vehicle right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left column — text */}
          <div className="flex flex-col gap-6 animate-slide-up">
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

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
              {/* Glass card behind image */}
              <div className="relative rounded-3xl bg-bg-card/40 border border-border-surface/20 backdrop-blur-xl p-6 rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent-primary/5 to-transparent pointer-events-none" />
                <img
                  src={getImageProxyUrl(HERO_VEHICLE_IMG)}
                  alt="Premium vehicle"
                  className="w-full h-auto object-contain drop-shadow-2xl animate-float"
                />
                {/* Price pill */}
                <div className="absolute -bottom-3 -right-3 px-4 py-2 rounded-2xl bg-bg-card/80 border border-border-surface/30 backdrop-blur-md shadow-lg">
                  <span className="text-xs font-bold text-accent-primary font-mono tracking-wider">
                    {t('landing.fromPrice')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking widget — glass card */}
        <div className="animate-slide-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
          <form
            onSubmit={onSearch}
            className="p-5 md:p-6 rounded-2xl bg-bg-card/60 border border-border-surface/30 backdrop-blur-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 items-end"
          >
            <FormField label={t('catalog.pickupDate')}>
              <div className="relative">
                <Input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="!h-9 rounded-lg pl-9"
                />
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-fg-tertiary pointer-events-none" />
              </div>
            </FormField>

            <FormField label={t('catalog.dropoffDate')}>
              <div className="relative">
                <Input
                  type="date"
                  min={dateFrom}
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="!h-9 rounded-lg pl-9"
                />
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-fg-tertiary pointer-events-none" />
              </div>
            </FormField>

            <FormField label={t('catalog.vehicleCategory')}>
              <select
                value={typeId}
                onChange={(e) => onTypeIdChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
              >
                <option value="">{t('catalog.allCategories')}</option>
                {vehicleTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>{vt.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label={t('catalog.brand')}>
              <select
                value={brandId}
                onChange={(e) => onBrandIdChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-border-surface/40 bg-bg-inset text-xs font-semibold px-3 text-fg-secondary outline-none focus:border-accent-primary"
              >
                <option value="">{t('catalog.allBrands')}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </FormField>

            <Button type="submit" className="w-full h-9 flex items-center justify-center gap-2">
              <Search size={14} />
              {t('catalog.search')}
            </Button>
          </form>
        </div>

        {/* Trust bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
          {[
            { icon: Shield, key: 'trustVehicles' },
            { icon: Clock, key: 'trustSupport' },
            { icon: Star, key: 'trustRating' },
            { icon: CreditCard, key: 'trustPricing' },
          ].map((item, i) => (
            <div
              key={item.key}
              className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl bg-bg-card/40 border border-border-surface/15 backdrop-blur-sm ${i < 3 ? 'md:border-r md:border-border-surface/10 md:rounded-none md:bg-transparent md:backdrop-blur-none' : ''}`}
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-accent-primary/10 flex items-center justify-center shrink-0">
                <item.icon size={16} className="text-accent-primary" />
              </div>
              <p className="text-[11px] md:text-xs font-bold text-fg-main leading-tight">
                {t(`landing.${item.key}`)}
              </p>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center animate-fade-in [animation-delay:1s] opacity-0 [animation-fill-mode:forwards]">
          <button
            onClick={scrollToCatalog}
            className="flex flex-col items-center gap-1 text-fg-tertiary hover:text-fg-secondary transition-colors cursor-pointer"
            aria-label={t('landing.scrollHint')}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">{t('landing.scrollHint')}</span>
            <ArrowDown size={16} className="animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
};
