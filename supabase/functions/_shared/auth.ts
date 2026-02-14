/**
 * Authentication & Authorization Middleware
 * Handles JWT verification and role-based access control
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'loan_officer' | 'client' | 'approver';
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Verify JWT and extract user info with role
 */
export async function verifyAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return { success: false, error: 'Server configuration error' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // Fetch user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData) {
      return { success: false, error: 'User role not found' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email || '',
        role: roleData.role as AuthUser['role']
      }
    };
  } catch (err) {
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Check if user has required role(s)
 */
export function requireRole(
  user: AuthUser,
  allowedRoles: AuthUser['role'][]
): { allowed: boolean; error?: string } {
  if (!allowedRoles.includes(user.role)) {
    return {
      allowed: false,
      error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
    };
  }
  return { allowed: true };
}

/**
 * Middleware to verify auth and role in one call
 */
export async function verifyAuthWithRole(
  req: Request,
  allowedRoles: AuthUser['role'][]
): Promise<AuthResult & { allowed: boolean }> {
  const authResult = await verifyAuth(req);
  
  if (!authResult.success || !authResult.user) {
    return { ...authResult, allowed: false };
  }

  const roleCheck = requireRole(authResult.user, allowedRoles);
  
  if (!roleCheck.allowed) {
    return {
      success: false,
      allowed: false,
      error: roleCheck.error
    };
  }

  return { ...authResult, allowed: true };
}

/**
 * Get Supabase client with service role (for RPC calls)
 */
export function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseServiceKey);
}
