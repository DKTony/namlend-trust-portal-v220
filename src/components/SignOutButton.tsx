import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export type SignOutButtonProps = React.ComponentProps<typeof Button> & {
  redirectTo?: string;
  withIcon?: boolean;
  label?: string;
};

const SignOutButton: React.FC<SignOutButtonProps> = ({
  redirectTo = "/auth",
  withIcon = true,
  label = "Sign Out",
  children,
  onClick,
  disabled,
  ...buttonProps
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    try {
      setBusy(true);
      // Preemptively clear local auth to avoid stale tokens during navigation race
      try {
        window.localStorage.removeItem('namlend-auth');
        window.sessionStorage.removeItem('namlend-auth');
      } catch {}
      // Watchdog: ensure we don't hang indefinitely if signOut is slow
      let completed = false;
      await Promise.race([
        (async () => {
          try {
            await signOut();
            completed = true;
          } catch (err) {
            console.error('SignOut error (non-fatal in button):', err);
          }
        })(),
        new Promise<void>((resolve) => setTimeout(resolve, 2500))
      ]);

      // Best-effort local cleanup if underlying signOut hung
      try {
        // Ensure local storage/session are cleared even if Supabase call failed or hung
        if (!completed) {
          window.localStorage.removeItem('namlend-auth');
          window.sessionStorage.removeItem('namlend-auth');
        }
      } catch {}
      navigate(redirectTo, { replace: true });
      // Fallback: if SPA navigation fails, immediately force a hard redirect
      // Use replace() to avoid growing history stack in edge cases
      setTimeout(() => {
        try {
          if (window.location.pathname !== redirectTo) {
            window.location.replace(redirectTo);
          }
        } catch {}
      }, 0);
    } finally {
      setBusy(false);
    }
  };

  const content = children ?? (busy ? "Signing Out…" : label);

  return (
    <Button
      {...buttonProps}
      onClick={handleClick}
      disabled={disabled || busy}
      aria-busy={busy}
    >
      {withIcon && <LogOut className="w-4 h-4 mr-2" />}
      {content}
    </Button>
  );
};

export default SignOutButton;
