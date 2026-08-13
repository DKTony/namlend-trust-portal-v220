import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { resolvePostLoginRoute } from '@/lib/routing';
import { cn } from '@/lib/utils';
import { ArrowRight, FileText, Loader2, Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

// Email validation schema
const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

type AuthMode = 'login' | 'signup' | 'forgot_password';

export default function Auth() {
  const {
    user,
    signIn,
    signUp,
    loading,
    resetPassword,
    updatePassword,
    authReady,
    isLoanOfficer,
    isPlatformStaff,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get('next');

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup State
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    idNumber: '',
  });

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  // Check if this is a password reset flow
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') {
      setIsPasswordReset(true);
    }
  }, [searchParams]);

  // Wait for both tenant and platform role queries before choosing a console.
  useEffect(() => {
    if (!user || isPasswordReset || !authReady) return;
    navigate(resolvePostLoginRoute(nextParam, { isPlatformStaff, isLoanOfficer }), {
      replace: true,
    });
  }, [user, authReady, isPasswordReset, nextParam, navigate, isPlatformStaff, isLoanOfficer]);

  // A failed OAuth callback (blocked account link, cancelled consent, any server-side
  // error) redirects back here with `oauth=return` but WITHOUT the `?code=` a success
  // carries — the library gives the browser no error signal, so this sentinel is the
  // only way to notice. Success returns also carry `oauth=return`, so wait out the
  // code exchange: only conclude failure once auth has settled and no session emerged.
  const oauthFailureChecked = useRef(false);
  useEffect(() => {
    if (searchParams.get('oauth') !== 'return' || oauthFailureChecked.current) return;
    if (loading) return; // ConvexAuthProvider still exchanging the code
    if (user) {
      oauthFailureChecked.current = true; // success — the redirect effect handles it
      return;
    }
    // Grace period: between the library consuming `?code=` and the session queries
    // resolving there is a brief authenticated-but-user-null window.
    const timer = setTimeout(() => {
      if (oauthFailureChecked.current) return;
      oauthFailureChecked.current = true;
      toast({
        title: 'Google sign-in did not complete',
        description:
          'If this email already has a password account, sign in with your password ' +
          'instead. Otherwise, please try again.',
        variant: 'destructive',
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [searchParams, loading, user]);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const emailValidation = emailSchema.safeParse(email.trim());
      if (!emailValidation.success) {
        toast({
          title: 'Invalid Email',
          description: emailValidation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const normalizedLoginEmail = email.trim().toLowerCase();

      const { error } = await signIn(normalizedLoginEmail, password);
      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Convex Auth handles session natively. The useEffect redirect (line ~58)
      // will fire once the profile and both role queries populate.
      toast({ title: 'Welcome back!', description: 'You have been successfully logged in.' });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const emailCheck = emailSchema.safeParse(signupData.email.trim());
      if (!emailCheck.success) {
        toast({
          title: 'Invalid Email',
          description: emailCheck.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Convex Auth's default password policy requires 8+ characters. Check it here so
      // the user gets a clear message instead of a raw server "Invalid password".
      if (signupData.password.length < 8) {
        toast({
          title: 'Password Too Short',
          description: 'Please use at least 8 characters.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const normalizedSignupEmail = emailCheck.data.toLowerCase();
      const { error } = await signUp(normalizedSignupEmail, signupData.password, {
        full_name: `${signupData.firstName} ${signupData.lastName}`.trim(),
        phone: signupData.phone,
        id_number: signupData.idNumber,
      });

      if (error) {
        toast({ title: 'Registration Failed', description: error.message, variant: 'destructive' });
      } else {
        // Profile + role are created by enrollUser, invoked from the
        // createOrUpdateUser callback in convex/auth.ts.
        // The useEffect redirect will fire once auth state settles.
        toast({ title: 'Account Created', description: 'Welcome! Your account has been created.' });
      }
    } catch (error) {
      toast({
        title: 'Registration Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const emailValidation = emailSchema.safeParse(forgotPasswordEmail.trim());
      if (!emailValidation.success) {
        toast({
          title: 'Invalid Email',
          description: emailValidation.error.errors[0].message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const { error } = await resetPassword(forgotPasswordEmail.trim().toLowerCase());
      if (error) {
        toast({ title: 'Reset Failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Email Sent', description: 'Check your email for reset instructions.' });
        setAuthMode('login');
      }
    } catch (error) {
      toast({
        title: 'Reset Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Minimum 6 characters required.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Password updated. Please sign in.' });
        setIsPasswordReset(false);
        setAuthMode('login');
        // Clearing reset mode releases the role-aware redirect effect above.
      }
    } catch (error) {
      toast({
        title: 'Update Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', 'bg-[#F7FAF6]')}>
        <Loader2 className={cn('h-8 w-8 animate-spin', 'font-sans text-[#274F35]')} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-500',
        'bg-[#F7FAF6]'
      )}
    >
      <div
        className={cn(
          'max-w-5xl w-full overflow-hidden flex md:min-h-[650px]',
          'rounded-2xl border border-[#DCE8D8] bg-white shadow-[0_12px_32px_rgba(39,79,53,0.06)]',
          'rounded-2xl'
        )}
      >
        {/* Left Side: Brand & Visual */}
        <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#274F35] p-12 text-white md:flex">
          {/* Abstract Background Elements */}
          <div className="pointer-events-none absolute -mr-20 -mt-20 h-96 w-96 rounded-full bg-[#7CA05C] opacity-25 blur-[120px] right-0 top-0" />
          <div className="pointer-events-none absolute -mb-10 -ml-10 h-80 w-80 rounded-full bg-[#3F713E] opacity-35 blur-[100px] bottom-0 left-0" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F7FAF6] p-1 shadow-glow">
                <img
                  src="/og-financial-mark-v2.svg"
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                OG Financial Services
              </span>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <h2 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight text-white">
              Financial freedom <br /> <span className="text-white/70">starts here.</span>
            </h2>
            <p className="text-lg leading-relaxed text-white/70">
              Apply for fair, regulated loans with verified KYC and a responsible credit review.
              Designed for the modern Namibian economy.
            </p>
          </div>

          <div className="relative z-10 flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm">
            <ShieldCheck size={18} className="text-[#BBD0AC]" />
            <span>Bank-Grade Security Encryption</span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div
          className={cn(
            'relative flex w-full flex-col justify-center bg-white p-5 sm:p-8 md:w-1/2 lg:p-12'
          )}
        >
          <div className="max-w-md mx-auto w-full">
            {/* Header Section */}
            <div className="mb-8">
              {isPasswordReset ? (
                <>
                  <h3 className={cn('text-2xl font-bold mb-2', 'font-sans text-[#274F35]')}>
                    Reset Password
                  </h3>
                  <p className="text-muted-foreground">Create a new secure password.</p>
                </>
              ) : authMode === 'login' ? (
                <>
                  <h3 className={cn('text-2xl font-bold mb-2', 'font-sans text-[#274F35]')}>
                    Welcome back
                  </h3>
                  <p className="text-muted-foreground">Please enter your details to sign in.</p>
                </>
              ) : authMode === 'signup' ? (
                <>
                  <h3 className={cn('text-2xl font-bold mb-2', 'font-sans text-[#274F35]')}>
                    Create Account
                  </h3>
                  <p className="text-muted-foreground">
                    Apply with OG Financial Services for responsible credit review.
                  </p>
                </>
              ) : (
                <>
                  <h3 className={cn('text-2xl font-bold mb-2', 'font-sans text-[#274F35]')}>
                    Forgot Password?
                  </h3>
                  <p className="text-muted-foreground">We'll send you a reset link.</p>
                </>
              )}
            </div>

            {/* Forms */}
            {isPasswordReset ? (
              // PASSWORD RESET FORM
              <form onSubmit={handlePasswordReset} className="space-y-5">
                <div className="space-y-2">
                  <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3 text-muted-foreground z-10" size={20} />
                    <ThemedInput
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-12"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3 text-muted-foreground z-10" size={20} />
                    <ThemedInput
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-12"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <ThemedButton type="submit" disabled={isLoading} className="w-full mt-4">
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Update Password'}
                </ThemedButton>
              </form>
            ) : authMode === 'login' ? (
              // LOGIN FORM
              <>
                <GoogleSignInButton next={nextParam} className="mb-5" />
                <form
                  onSubmit={handleLogin}
                  className="space-y-5"
                  data-e2e-convex-url={import.meta.env.VITE_CONVEX_URL ?? ''}
                >
                  <div className="space-y-2">
                    <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-3 text-muted-foreground z-10"
                        size={20}
                      />
                      <ThemedInput
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12"
                        placeholder="name@example.com"
                        required
                        data-testid="email-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setAuthMode('forgot_password')}
                        className="text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-3 text-muted-foreground z-10"
                        size={20}
                      />
                      <ThemedInput
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12"
                        placeholder="••••••••"
                        required
                        data-testid="password-input"
                      />
                    </div>
                  </div>

                  <ThemedButton
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4"
                    data-testid="login-button"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        Sign In <ArrowRight size={20} />
                      </>
                    )}
                  </ThemedButton>
                </form>
              </>
            ) : authMode === 'signup' ? (
              // SIGNUP FORM
              <>
                <GoogleSignInButton next={nextParam} className="mb-4" />
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                        First Name
                      </label>
                      <div className="relative">
                        <User
                          className="absolute left-4 top-3 text-muted-foreground z-10"
                          size={18}
                        />
                        <ThemedInput
                          value={signupData.firstName}
                          onChange={(e) =>
                            setSignupData({ ...signupData, firstName: e.target.value })
                          }
                          className="pl-10"
                          placeholder="John"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                        Last Name
                      </label>
                      <div className="relative">
                        <User
                          className="absolute left-4 top-3 text-muted-foreground z-10"
                          size={18}
                        />
                        <ThemedInput
                          value={signupData.lastName}
                          onChange={(e) =>
                            setSignupData({ ...signupData, lastName: e.target.value })
                          }
                          className="pl-10"
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-3 text-muted-foreground z-10"
                        size={18}
                      />
                      <ThemedInput
                        type="email"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        className="pl-10"
                        placeholder="name@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                        Phone
                      </label>
                      <div className="relative">
                        <Phone
                          className="absolute left-4 top-3 text-muted-foreground z-10"
                          size={18}
                        />
                        <ThemedInput
                          value={signupData.phone}
                          onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                          className="pl-10"
                          placeholder="+264 81..."
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                        ID Number
                      </label>
                      <div className="relative">
                        <FileText
                          className="absolute left-4 top-3 text-muted-foreground z-10"
                          size={18}
                        />
                        <ThemedInput
                          value={signupData.idNumber}
                          onChange={(e) =>
                            setSignupData({ ...signupData, idNumber: e.target.value })
                          }
                          className="pl-10"
                          placeholder="ID Number"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-3 text-muted-foreground z-10"
                        size={18}
                      />
                      <ThemedInput
                        type="password"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        className="pl-10"
                        placeholder="Create password"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-3 text-muted-foreground z-10"
                        size={18}
                      />
                      <ThemedInput
                        type="password"
                        value={signupData.confirmPassword}
                        onChange={(e) =>
                          setSignupData({ ...signupData, confirmPassword: e.target.value })
                        }
                        className="pl-10"
                        placeholder="Confirm password"
                        required
                      />
                    </div>
                  </div>

                  <ThemedButton type="submit" disabled={isLoading} className="w-full mt-4">
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        Create Account <ArrowRight size={20} />
                      </>
                    )}
                  </ThemedButton>
                </form>
              </>
            ) : (
              // FORGOT PASSWORD FORM
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <label className={cn('text-sm font-semibold', 'font-sans text-[#274F35]')}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3 text-muted-foreground z-10" size={20} />
                    <ThemedInput
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="pl-12"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <ThemedButton type="submit" disabled={isLoading} className="w-full mt-4">
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                </ThemedButton>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Footer Links */}
            {!isPasswordReset && authMode !== 'forgot_password' && (
              <div className="mt-8 text-center">
                {authMode === 'login' ? (
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{' '}
                    <button
                      onClick={() => setAuthMode('signup')}
                      className="text-foreground font-semibold hover:underline"
                    >
                      Create one
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      onClick={() => setAuthMode('login')}
                      className="text-foreground font-semibold hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
