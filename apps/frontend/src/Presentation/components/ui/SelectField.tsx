import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  required?: boolean;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ className = '', label, error, options, required, ...props }, ref) => {
    return (
      <div className={`flex flex-col gap-1.5 w-full ${className}`}>
        {label ? (
          <label className="text-xs font-semibold text-fg-secondary">
            {label} {required ? <span className="text-red-500">*</span> : null}
          </label>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full h-11 px-4 rounded-xl border bg-bg-inset border-border-surface text-fg-main focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary transition-all duration-200 appearance-none ${
              error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''
            }`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-elevated text-fg-main">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-fg-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error ? (
          <span className="text-[11px] font-medium text-red-500 mt-0.5">{error}</span>
        ) : null}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';
