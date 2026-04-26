import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { ThemedButton } from './ThemedButton';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  backLink?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  backLink,
  actions,
  icon,
  className,
}) => {
  const { styles } = useTheme();
  const navigate = useNavigate();

  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {backLink && (
            <ThemedButton
              variant="ghost"
              size="icon"
              onClick={() => navigate(backLink)}
              className="shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </ThemedButton>
          )}
          {icon && (
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className={cn('text-2xl font-bold tracking-tight', styles.textClass)}>{title}</h1>
            {description && <p className="text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
