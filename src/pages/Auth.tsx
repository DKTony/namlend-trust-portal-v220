import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Mail, Lock, ArrowRight, User, Phone, FileText, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Email validation schema
const emailSchema = z.string().email('Please enter a valid email address').min(1, 'Email is required');

type AuthMode = 'login' | 'signup' | 'forgot_password';

export default function Auth() {
  const { user, signIn, signUp, loading, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
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
    idNumber: ''
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

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const emailValidation = emailSchema.safeParse(email.trim());
      if (!emailValidation.success) {
        toast({
          title: "Invalid Email",
          description: emailValidation.error.errors[0].message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const normalizedLoginEmail = email.trim().toLowerCase();
      
      const { error } = await signIn(normalizedLoginEmail, password);
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({ title: "Login Error", description: "Failed to establish session.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Determine role
      let resolvedRole = 'client';
      const { data: rolesData } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const roles = rolesData?.map(r => r.role) ?? [];
      
      if (roles.includes('admin')) resolvedRole = 'admin';
      else if (roles.includes('loan_officer')) resolvedRole = 'loan_officer';
      
      // Mock fallback
      if (user.email?.includes('admin')) resolvedRole = 'admin';

      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (resolvedRole === 'admin' || resolvedRole === 'loan_officer') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      
      toast({ title: "Welcome back!", description: `You have been successfully logged in.` });
      
    } catch (error) {
      console.error('Login error:', error);
      toast({ title: "Login Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const emailCheck = emailSchema.safeParse(signupData.email.trim());
      if (!emailCheck.success) {
        toast({ title: "Invalid Email", description: emailCheck.error.errors[0].message, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const normalizedSignupEmail = emailCheck.data.toLowerCase();
      const { error } = await signUp(normalizedSignupEmail, signupData.password, {
        first_name: signupData.firstName,
        last_name: signupData.lastName,
        phone: signupData.phone,
        id_number: signupData.idNumber
      });
      
      if (error) {
        toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_roles').insert({ user_id: user.id, role: 'client' });
          navigate('/dashboard', { replace: true });
          return;
        }
        toast({ title: "Account Created", description: `Welcome! Your account has been created.` });
      }
    } catch (error) {
      toast({ title: "Registration Error", description: "An unexpected error occurred.", variant: "destructive" });
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
        toast({ title: "Invalid Email", description: emailValidation.error.errors[0].message, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const { error } = await resetPassword(forgotPasswordEmail.trim().toLowerCase());
      if (error) {
        toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Email Sent", description: "Check your email for reset instructions." });
        setAuthMode('login');
      }
    } catch (error) {
      toast({ title: "Reset Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password Too Short", description: "Minimum 6 characters required.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Password updated. Please sign in." });
        setIsPasswordReset(false);
        setAuthMode('login');
        navigate('/dashboard');
      }
    } catch (error) {
      toast({ title: "Update Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-[32px] shadow-2xl overflow-hidden flex min-h-[650px]">
        
        {/* Left Side: Brand & Visual */}
        <div className="w-1/2 bg-black text-white p-12 hidden md:flex flex-col justify-between relative overflow-hidden">
          {/* Abstract Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600 rounded-full blur-[100px] opacity-20 -ml-10 -mb-10 pointer-events-none"></div>
            
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-glow">N</div>
              <span className="text-xl font-bold tracking-tight">NamLend Trust</span>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <h2 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
              Financial freedom <br/> <span className="text-zinc-500">starts here.</span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Access fair, regulated loans with AI-powered instant approval. Designed for the modern Namibian economy.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 text-sm text-zinc-500 font-medium bg-white/5 w-fit px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span>Bank-Grade Security Encryption</span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 lg:p-12 flex flex-col justify-center relative bg-white">
          <div className="max-w-md mx-auto w-full">
            
            {/* Header Section */}
            <div className="mb-8">
              {isPasswordReset ? (
                <>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">Reset Password</h3>
                  <p className="text-zinc-500">Create a new secure password.</p>
                </>
              ) : authMode === 'login' ? (
                <>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">Welcome back</h3>
                  <p className="text-zinc-500">Please enter your details to sign in.</p>
                </>
              ) : authMode === 'signup' ? (
                <>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">Create Account</h3>
                  <p className="text-zinc-500">Join NamLend for instant loan access.</p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">Forgot Password?</h3>
                  <p className="text-zinc-500">We'll send you a reset link.</p>
                </>
              )}
            </div>

            {/* Forms */}
            {isPasswordReset ? (
              // PASSWORD RESET FORM
              <form onSubmit={handlePasswordReset} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-900">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-900">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg shadow-zinc-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <>Update Password <ArrowRight size={20} /></>}
                </button>
              </form>
            ) : authMode === 'login' ? (
              // LOGIN FORM
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-900">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-zinc-900">Password</label>
                    <button 
                      type="button"
                      onClick={() => setAuthMode('forgot_password')}
                      className="text-xs font-medium text-zinc-500 hover:text-black transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 mt-6 shadow-lg shadow-zinc-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <>Sign In <ArrowRight size={20} /></>}
                </button>
              </form>
            ) : authMode === 'signup' ? (
              // SIGNUP FORM
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-900">First Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                      <input
                        value={signupData.firstName}
                        onChange={(e) => setSignupData({...signupData, firstName: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-sm"
                        placeholder="John"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-900">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                      <input
                        value={signupData.lastName}
                        onChange={(e) => setSignupData({...signupData, lastName: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-sm"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-900">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-sm"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-900">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                      <input
                        value={signupData.phone}
                        onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-sm"
                        placeholder="+264 81..."
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-zinc-900">ID Number</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                      <input
                        value={signupData.idNumber}
                        onChange={(e) => setSignupData({...signupData, idNumber: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-sm"
                        placeholder="ID Number"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-900">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-sm"
                      placeholder="Create password"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-900">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-zinc-400" size={18} />
                    <input
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium text-sm"
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg shadow-zinc-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <>Create Account <ArrowRight size={20} /></>}
                </button>
              </form>
            ) : (
              // FORGOT PASSWORD FORM
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-900">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-zinc-400" size={20} />
                    <input
                      type="email"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all font-medium"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg shadow-zinc-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                </button>
                
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-sm text-zinc-500 hover:text-black font-medium"
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
                  <p className="text-sm text-zinc-400">
                    Don't have an account?{' '}
                    <button onClick={() => setAuthMode('signup')} className="text-black font-semibold hover:underline">
                      Create one
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-zinc-400">
                    Already have an account?{' '}
                    <button onClick={() => setAuthMode('login')} className="text-black font-semibold hover:underline">
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