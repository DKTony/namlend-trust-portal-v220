import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Shield, Phone, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Email validation schema
const emailSchema = z.string().email('Please enter a valid email address').min(1, 'Email is required');

export default function Auth() {
  const { user, signIn, signUp, loading, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    idNumber: ''
  });

  // Check if this is a password reset flow
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') {
      setIsPasswordReset(true);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Don't redirect here - let the sign-in process handle the redirect
  // This prevents premature redirects before role assignment

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate email format
      const emailValidation = emailSchema.safeParse(loginEmail.trim());
      if (!emailValidation.success) {
        toast({
          title: "Invalid Email",
          description: emailValidation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }

      const normalizedLoginEmail = loginEmail.trim().toLowerCase();
      console.log('Attempting login with:', { email: normalizedLoginEmail });
      
      const { error } = await signIn(normalizedLoginEmail, loginPassword);
      if (error) {
        console.error('Sign-in error:', error);
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Wait for user session to be established
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Failed to get user after sign-in:', userError);
        toast({
          title: "Login Error",
          description: "Failed to establish session. Please try again.",
          variant: "destructive"
        });
        return;
      }

      console.log('User authenticated:', user.id);

      // Determine role from DB only; fetch all roles then apply precedence
      let resolvedRole: 'admin' | 'loan_officer' | 'client' = 'client';
      try {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
        }
        const roles = rolesData?.map(r => r.role) ?? [];
        if (roles.includes('admin')) {
          resolvedRole = 'admin';
        } else if (roles.includes('loan_officer')) {
          resolvedRole = 'loan_officer';
        } else if (roles.includes('client')) {
          resolvedRole = 'client';
        }
        // For mock client, check email for admin role
        if (user.email?.includes('admin')) {
          resolvedRole = 'admin';
        }
      } catch (roleError) {
        console.error('Role fetch error:', roleError);
      }

      // Small delay to allow auth state to propagate
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Navigate based on resolved role from DB
      if (resolvedRole === 'admin' || resolvedRole === 'loan_officer') {
        console.log('Navigating to admin dashboard');
        navigate('/admin', { replace: true });
      } else {
        console.log('Navigating to user dashboard');
        navigate('/dashboard', { replace: true });
      }
      
      toast({
        title: "Welcome back!",
        description: `You have been successfully logged in.`
      });
      
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Validate and normalize email
      const emailCheck = emailSchema.safeParse(signupData.email.trim());
      if (!emailCheck.success) {
        toast({
          title: "Invalid Email",
          description: emailCheck.error.errors[0].message,
          variant: "destructive"
        });
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
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        // Assign selected role to new user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Always assign client role on signup
          await supabase
            .from('user_roles')
            .insert({
              user_id: user.id,
              role: 'client'
            });

          navigate('/dashboard', { replace: true });
          return;
        }
        
        toast({
          title: "Account Created",
          description: `Welcome! Your account has been created.`,
        });
      }
    } catch (error) {
      toast({
        title: "Registration Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate email format
      const emailValidation = emailSchema.safeParse(forgotPasswordEmail.trim());
      if (!emailValidation.success) {
        toast({
          title: "Invalid Email",
          description: emailValidation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }

      const normalizedEmail = forgotPasswordEmail.trim().toLowerCase();
      const { error } = await resetPassword(normalizedEmail);
      
      if (error) {
        toast({
          title: "Reset Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password Reset Email Sent",
          description: "Please check your email for password reset instructions.",
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      }
    } catch (error) {
      toast({
        title: "Reset Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await updatePassword(newPassword);
      
      if (error) {
        toast({
          title: "Password Update Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password Updated Successfully",
          description: "Your password has been changed. You can now sign in with your new password.",
        });
        setIsPasswordReset(false);
        setNewPassword('');
        setConfirmPassword('');
        // Navigate to dashboard or appropriate page
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        title: "Password Update Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              NamLend
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
            <Shield className="h-4 w-4" />
            NAMFISA Licensed & Regulated
          </div>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isPasswordReset && <Key className="h-5 w-5" />}
              {isPasswordReset ? "Reset Your Password" : "Access Your Account"}
            </CardTitle>
            <CardDescription>
              {isPasswordReset 
                ? "Enter your new password to complete the reset process"
                : "Sign in to manage your loans or create a new account"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPasswordReset ? (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters long
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    minLength={6}
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !newPassword || !confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordReset(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="loginEmail">Email</Label>
                    <Input
                      key="login-email"
                      id="loginEmail"
                      name="login_email"
                      type="email"
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      inputMode="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value.replace(/\s/g, ''))}
                      onPaste={(e) => { e.preventDefault(); const text = e.clipboardData.getData('text'); setLoginEmail(text.replace(/\s/g, '').trim()); }}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={signupData.firstName}
                        onChange={(e) => setSignupData({...signupData, firstName: e.target.value})}
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={signupData.lastName}
                        onChange={(e) => setSignupData({...signupData, lastName: e.target.value})}
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <Input
                      key="signup-email"
                      id="signupEmail"
                      name="signup_email"
                      type="email"
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      inputMode="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({...signupData, email: e.target.value.replace(/\s/g, '')})}
                      onPaste={(e) => { e.preventDefault(); const text = e.clipboardData.getData('text'); setSignupData({...signupData, email: text.replace(/\s/g, '').trim()}); }}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={signupData.phone}
                        onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                        placeholder="+264 81 123 4567"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="idNumber">ID Number</Label>
                    <Input
                      id="idNumber"
                      value={signupData.idNumber}
                      onChange={(e) => setSignupData({...signupData, idNumber: e.target.value})}
                      placeholder="Enter your ID number"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <Input
                      id="signupPassword"
                      type="password"
                      autoComplete="new-password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      placeholder="Create a password"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                  
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
            
            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>Reset Password</CardTitle>
                    <CardDescription>
                      Enter your email address and we'll send you a link to reset your password.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgotEmail">Email</Label>
                        <Input
                          id="forgotEmail"
                          type="email"
                          autoComplete="email"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          inputMode="email"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value.replace(/\s/g, ''))}
                          onPaste={(e) => { e.preventDefault(); const text = e.clipboardData.getData('text'); setForgotPasswordEmail(text.replace(/\s/g, '').trim()); }}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowForgotPassword(false);
                            setForgotPasswordEmail('');
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Send Reset Link'
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>By signing up, you agree to our Terms of Service and Privacy Policy.</p>
              <p className="mt-2">Licensed by NAMFISA • Member of FIC</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}