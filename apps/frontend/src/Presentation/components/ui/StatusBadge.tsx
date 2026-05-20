import React from 'react';
import { useTranslation } from 'react-i18next';

export interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  
  const statusConfig: Record<string, { bg: string; text: string; dot: string; labelKey: string }> = {
    // General Entity / Shift Status
    ACTIVE: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-500', dot: 'bg-emerald-500', labelKey: 'common.active' },
    INACTIVE: { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400', labelKey: 'common.inactive' },
    
    // Customer Status
    SUSPENDED: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-500', dot: 'bg-amber-500', labelKey: 'customers.suspended' },
    BLACKLISTED: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-500', dot: 'bg-red-500', labelKey: 'customers.blacklisted' },
    
    // Vehicle Status
    AVAILABLE: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-500', dot: 'bg-emerald-500', labelKey: 'vehicles.available' },
    RENTED: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-500', dot: 'bg-blue-500', labelKey: 'vehicles.rented' },
    UNDER_INSPECTION: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-500', dot: 'bg-amber-500', labelKey: 'vehicles.underInspection' },
    MAINTENANCE: { bg: 'bg-indigo-500/10 border-indigo-500/20', text: 'text-indigo-500', dot: 'bg-indigo-500', labelKey: 'vehicles.maintenance' },
    RETIRED: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-500', dot: 'bg-red-500', labelKey: 'vehicles.retired' },

    // Cleaning Status
    CLEAN: { bg: 'bg-teal-500/10 border-teal-500/20', text: 'text-teal-500', dot: 'bg-teal-500', labelKey: 'vehicles.clean' },
    DIRTY: { bg: 'bg-amber-800/10 border-amber-800/20', text: 'text-amber-700 dark:text-amber-500', dot: 'bg-amber-700 dark:bg-amber-500', labelKey: 'vehicles.dirty' },
  };

  const config = statusConfig[status.toUpperCase()] || {
    bg: 'bg-slate-500/10 border-slate-500/20',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
    labelKey: status,
  };

  const label = config.labelKey.includes('.') ? t(config.labelKey) : config.labelKey;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
};
