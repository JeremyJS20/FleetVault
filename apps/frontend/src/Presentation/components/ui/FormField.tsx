import React from 'react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label ? (
        <label className="text-sm font-semibold text-fg-secondary truncate w-full" title={label}>
          {label} {required ? <span className="text-red-500 shrink-0">*</span> : null}
        </label>
      ) : null}
      {React.cloneElement(children, { error: error || undefined } as any)}
      {error ? (
        <span className="text-xs font-medium text-red-500 mt-0.5">{error}</span>
      ) : null}
    </div>
  );
};
