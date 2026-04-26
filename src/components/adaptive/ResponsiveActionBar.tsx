import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveActionBarProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  actionClassName?: string;
}

export const ResponsiveActionBar: React.FC<ResponsiveActionBarProps> = ({
  title,
  description,
  actions,
  children,
  className,
  actionClassName,
}) => {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      {(title || description || children) && (
        <div className="min-w-0 flex-1">
          {title}
          {description}
          {children}
        </div>
      )}
      {actions && (
        <div
          className={cn('flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end', actionClassName)}
        >
          {actions}
        </div>
      )}
    </div>
  );
};

export default ResponsiveActionBar;
