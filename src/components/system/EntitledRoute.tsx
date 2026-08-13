import { Button } from '@/components/ui/button';
import { useEntitlements } from '@/hooks/useEntitlements';
import { Loader2, ShieldOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface EntitledRouteProps {
  featureKey: string;
  children: ReactNode;
  returnTo?: string;
}

/** UI/deep-link guard. Backend entitlement assertions remain the security boundary. */
export function EntitledRoute({
  featureKey,
  children,
  returnTo = '/dashboard',
}: EntitledRouteProps) {
  const { hasFeature, isLoading } = useEntitlements();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" data-testid="feature-loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading features" />
      </div>
    );
  }

  if (hasFeature(featureKey)) return children;

  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center"
      data-testid="feature-not-enabled"
    >
      <ShieldOff className="h-12 w-12 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Feature unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This feature is not included for your organisation. Contact your support team if you need
          access.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to={returnTo}>Return to an available page</Link>
      </Button>
    </div>
  );
}
