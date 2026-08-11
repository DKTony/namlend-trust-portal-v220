import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import { useMutation } from 'convex/react';
import { ArrowRight, FileText, Loader2, Phone } from 'lucide-react';
import { ReactNode, useState } from 'react';

/**
 * Collects the details an OAuth provider cannot give us.
 *
 * Google returns email, name and avatar — but this is a regulated lending platform
 * that needs a phone number and a national ID number before a borrower can do
 * anything meaningful. Password sign-up already collects both on its form; this is
 * the equivalent step for Google sign-ups.
 *
 * Implemented as a render-time gate rather than a `/complete-profile` route. A route
 * would have to intercept navigation, stash the pending `?next=` somewhere and re-emit
 * it after submit — and it would race the `?code=` cleanup that ConvexAuthProvider
 * performs via history.replaceState, outside React Router's knowledge. A gate needs
 * none of that: the URL never changes, and on success the children simply render.
 */
export const ProfileCompletionGate = ({ children }: { children: ReactNode }) => {
  const { needsProfileCompletion } = useAuth();
  if (!needsProfileCompletion) return <>{children}</>;
  return <ProfileCompletionForm />;
};

const ProfileCompletionForm = () => {
  const { styles } = useTheme();
  const completeEnrollment = useMutation(api.users.completeEnrollment);
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !idNumber.trim()) {
      toast({
        title: 'Details required',
        description: 'Please provide both your phone number and ID number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await completeEnrollment({ phone: phone.trim(), idNumber: idNumber.trim() });
      // No navigation needed — `needsProfileCompletion` flips reactively once the
      // mutation lands, and the gate stops rendering.
      toast({ title: 'Profile complete', description: 'Thanks — you are all set.' });
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
      setIsSaving(false);
    }
  };

  return (
    <div
      className={cn('min-h-screen flex items-center justify-center p-4', styles.background)}
      data-testid="profile-completion-gate"
    >
      <div className={cn('w-full max-w-md p-8', styles.cardClass, styles.radius)}>
        <h1 className={cn('text-2xl font-bold mb-2', styles.textClass)}>Complete your profile</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          We need a couple more details before you can continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className={cn('text-sm font-semibold', styles.textClass)} htmlFor="cp-phone">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-3 text-muted-foreground z-10" size={18} />
              <ThemedInput
                id="cp-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                placeholder="+264 81..."
                required
                data-testid="completion-phone-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={cn('text-sm font-semibold', styles.textClass)} htmlFor="cp-id">
              ID Number
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-3 text-muted-foreground z-10" size={18} />
              <ThemedInput
                id="cp-id"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="pl-10"
                placeholder="ID Number"
                required
                data-testid="completion-id-input"
              />
            </div>
          </div>

          <ThemedButton
            type="submit"
            disabled={isSaving}
            className="w-full"
            data-testid="completion-submit"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Continue <ArrowRight size={18} />
              </>
            )}
          </ThemedButton>
        </form>
      </div>
    </div>
  );
};
