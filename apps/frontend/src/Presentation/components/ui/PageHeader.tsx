import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, children }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-border-surface mb-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-fg-main">
          {title}
        </h1>
        {description ? (
          <p className="text-base font-semibold text-fg-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex items-center gap-3">
          {children}
        </div>
      ) : null}
    </div>
  );
};
