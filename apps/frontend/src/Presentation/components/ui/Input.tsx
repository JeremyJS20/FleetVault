import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={`w-full h-11 px-4 rounded-xl border bg-bg-inset border-border-surface text-fg-main placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary transition-all duration-200 ${
          error ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' : ''
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
