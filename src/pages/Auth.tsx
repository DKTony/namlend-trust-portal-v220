import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Mail, Lock, ArrowRight, User, Phone, FileText } from 'lucide-react';
import { z } from 'zod';
import { useTheme } from '@/context/ThemeContext';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { cn } from '@/lib/utils';

// Email validation schema
const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

type AuthMode = 'login' | 'signup' | 'forgot_password';

export default function Auth() {
  const { user, signIn, signUp, loading, resetPassword, updatePassword, userRole, isAdmin } =
    useAuth();
  const { styles } = useTheme();
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

  // Redirect authenticated users away from /auth
  useEffect(() => {
    if (!user || isPasswordReset) return;
    if (nextParam) {
      navigate(nextParam, { replace: true });
      return;
    }
    if (isAdmin || userRole === 'loan_officer') {
      navigate('/admin', { replace: true });
      return;
    }
    navigate('/dashboard', { replace: true });
  }, [user, isPasswordReset, nextParam, navigate, isAdmin, userRole]);

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
      // will fire once `user` and `userRole` populate from reactive queries.
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

      const normalizedSignupEmail = emailCheck.data.toLowerCase();
      const { error } = await signUp(normalizedSignupEmail, signupData.password, {
        full_name: `${signupData.firstName} ${signupData.lastName}`.trim(),
        phone: signupData.phone,
      });

      if (error) {
        toast({ title: 'Registration Failed', description: error.message, variant: 'destructive' });
      } else {
        // Profile + role are created by convex/auth.ts afterUserCreatedOrUpdated callback.
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
        navigate('/dashboard');
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
      <div className={cn('min-h-screen flex items-center justify-center', styles.background)}>
        <Loader2 className={cn('h-8 w-8 animate-spin', styles.textClass)} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-500',
        styles.background
      )}
    >
      <div
        className={cn(
          'max-w-5xl w-full overflow-hidden flex md:min-h-[650px]',
          styles.cardClass,
          styles.radius
        )}
      >
        {/* Left Side: Brand & Visual */}
        <div className="w-1/2 bg-zinc-950 text-white p-12 hidden md:flex flex-col justify-between relative overflow-hidden">
          {/* Abstract Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600 rounded-full blur-[100px] opacity-20 -ml-10 -mb-10 pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-primary-foreground text-xl shadow-glow">
                N
              </div>
              <span className="text-xl font-bold tracking-tight text-white">NamLend Trust</span>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <h2 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight text-white">
              Financial freedom <br /> <span className="text-zinc-400">starts here.</span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Access fair, regulated loans with AI-powered instant approval. Designed for the modern
              Namibian economy.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-sm text-zinc-400 font-medium bg-white/5 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span>Bank-Grade Security Encryption</span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div
          className={cn(
            'w-full md:w-1/2 p-5 sm:p-8 lg:p-12 flex flex-col justify-center relative',
            styles.variant === 'glass' ? 'bg-white/5 backdrop-blur-sm' : 'bg-card'
          )}
        >
          <div className="max-w-md mx-auto w-full">
            {/* Header Section */}
            <div className="mb-8">
              {isPasswordReset ? (
                <>
                  <h3 className={cn('text-2xl font-bold mb-2', styles.textClass)}>
                    Reset Password
                  </h3>
                  <p className="text-muted-foreground">Create a new secure password.</p>
                </>
              ) : authMode === 'login' ? (
                <>
                  <h3 className={cn('text-2xl font-bold mb-2', styles.textClass)}>Welcome back</h3>
                  <p className="text-muted-foreground">Please enter your details to sign in.</p>
                </>
              ) : authMode === 'signup' ? (
                <>
                  <h3 className={cn('text-2xl font-bold mb-2', styles.textClass)}>
                    Create Account
                  </h3>
                  <p className="text-muted-foreground">Join NamLend for instant loan access.</p>
                </>
              ) : (
                <>
                  <h3 className={cn('text-2xl font-bold mb-2', styles.textClass)}>
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
                  <label className={cn('text-sm font-semibold', styles.textClass)}>
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
                  <label className={cn('text-sm font-semibold', styles.textClass)}>
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
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className={cn('text-sm font-semibold', styles.textClass)}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3 text-muted-foreground z-10" size={20} />
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
                    <label className={cn('text-sm font-semibold', styles.textClass)}>
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
                    <Lock className="absolute left-4 top-3 text-muted-foreground z-10" size={20} />
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
            ) : authMode === 'signup' ? (
              // SIGNUP FORM
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={cn('text-sm font-semibold', styles.textClass)}>
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
                    <label className={cn('text-sm font-semibold', styles.textClass)}>
                      Last Name
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-4 top-3 text-muted-foreground z-10"
                        size={18}
                      />
                      <ThemedInput
                        value={signupData.lastName}
                        onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                        className="pl-10"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={cn('text-sm font-semibold', styles.textClass)}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3 text-muted-foreground z-10" size={18} />
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
                    <label className={cn('text-sm font-semibold', styles.textClass)}>Phone</label>
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
                    <label className={cn('text-sm font-semibold', styles.textClass)}>
                      ID Number
                    </label>
                    <div className="relative">
                      <FileText
                        className="absolute left-4 top-3 text-muted-foreground z-10"
                        size={18}
                      />
                      <ThemedInput
                        value={signupData.idNumber}
                        onChange={(e) => setSignupData({ ...signupData, idNumber: e.target.value })}
                        className="pl-10"
                        placeholder="ID Number"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={cn('text-sm font-semibold', styles.textClass)}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3 text-muted-foreground z-10" size={18} />
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
                  <label className={cn('text-sm font-semibold', styles.textClass)}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3 text-muted-foreground z-10" size={18} />
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
            ) : (
              // FORGOT PASSWORD FORM
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <label className={cn('text-sm font-semibold', styles.textClass)}>Email</label>
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
