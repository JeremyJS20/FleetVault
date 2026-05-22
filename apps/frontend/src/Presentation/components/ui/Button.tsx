import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-gradient-to-r from-accent-primary to-accent-primary-end text-white shadow-[0_4px_14px_0_rgba(14,142,154,0.15)] hover:shadow-[0_6px_20px_0_rgba(14,142,154,0.25)] hover:-translate-y-0.5 active:scale-98',
      secondary: 'bg-surface-inset border border-surface-border text-fg-main hover:bg-surface-elevated active:scale-98',
      ghost: 'text-fg-secondary hover:bg-surface-inset hover:text-fg-main active:scale-98',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:-translate-y-0.5 active:scale-98',
    };

    const sizes = {
      sm: 'h-10 px-5 rounded-xl text-xs',
      md: 'h-12 px-7 rounded-2xl text-sm',
      lg: 'h-14 px-9 rounded-2xl text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
