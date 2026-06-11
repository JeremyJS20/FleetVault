import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  loading?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, loading }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={loading}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 ${checked ? 'bg-accent-primary' : 'bg-border-surface/40'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
  </button>
);
