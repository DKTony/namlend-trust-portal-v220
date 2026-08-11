import { api } from '@/integrations/convex/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useQuery } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Google mark, inlined as SVG on purpose. A remote logo (or the Google Identity
 * Services widget) would need `img-src`/`script-src`/`frame-src` grants in the
 * netlify.toml CSP; this way the OAuth feature needs no CSP change at all.
 */
const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
    />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
    />
  </svg>
);

interface GoogleSignInButtonProps {
  /** Validated in-app path to return to after the handshake. */
  next?: string | null;
  className?: string;
}

/**
 * Renders nothing unless the deployment actually has Google credentials configured.
 * The check is a server query rather than a build-time flag so the button can never
 * be visible against a backend that would reject the handshake — and so enabling or
 * rolling back the feature is an env-var change with no redeploy.
 */
export const GoogleSignInButton = ({ next, className }: GoogleSignInButtonProps) => {
  const providers = useQuery(api.authProviders.listEnabled, {});
  const { signInWithGoogle } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // `undefined` = still loading. Render nothing rather than flashing a button that
  // may be about to disappear.
  if (!providers?.google) return null;

  const handleClick = async () => {
    setIsRedirecting(true);
    const { error } = await signInWithGoogle(next);
    if (error) {
      // Only reached if the handshake fails to start — a success navigates away.
      setIsRedirecting(false);
      toast({
        title: 'Google sign-in unavailable',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={isRedirecting}
        data-testid="google-signin-button"
        className={cn(
          'w-full flex items-center justify-center gap-3 rounded-lg border border-border',
          'bg-background px-4 py-3 text-sm font-semibold text-foreground',
          'transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
      >
        {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
        {isRedirecting ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
};
