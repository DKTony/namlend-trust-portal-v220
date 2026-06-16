import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { cn } from '@/lib/utils';
import React from 'react';

interface AdaptiveShellProps {
  sidebar?: React.ReactNode;
  rail?: React.ReactNode;
  mobileNavigation?: React.ReactNode;
  bottomNavigation?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  mainClassName?: string;
  contentClassName?: string;
}

export const AdaptiveShell: React.FC<AdaptiveShellProps> = ({
  sidebar,
  rail,
  mobileNavigation,
  bottomNavigation,
  header,
  children,
  className,
  mainClassName,
  contentClassName,
}) => {
  const layout = useAdaptiveLayout();

  return (
    <div
      className={cn('adaptive-shell flex min-h-dvh h-dvh overflow-hidden', className)}
      data-layout-size={layout.widthClass}
      data-compact-height={layout.isCompactHeight ? 'true' : 'false'}
      data-touch={layout.isTouch ? 'true' : 'false'}
    >
      {layout.isCompact ? mobileNavigation : layout.isMedium ? rail || sidebar : sidebar}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        {header}
        <main
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 md:px-6 lg:px-8 lg:py-6',
            layout.isCompact &&
              bottomNavigation &&
              'pb-[calc(5.25rem+env(safe-area-inset-bottom))]',
            mainClassName
          )}
        >
          <div className={cn('mx-auto w-full max-w-7xl space-y-6', contentClassName)}>
            {children}
          </div>
        </main>
        {layout.isCompact && bottomNavigation}
      </div>
    </div>
  );
};

export default AdaptiveShell;
