/**
 * API Users - Orchestration Layer
 * Centralized API for user management operations
 * 
 * Endpoints:
 * - GET    /profile           - Get current user profile
 * - PATCH  /profile           - Update current user profile
 * - GET    /list              - List users (admin only)
 * - GET    /:id               - Get user by ID (admin/loan_officer)
 * - PATCH  /:id/role          - Update user role (admin only)
 * - GET    /roles             - List all roles (staff only)
 */

import { createRouter } from '../_shared/router.ts';
import { verifyAuth, verifyAuthWithRole, getServiceClient } from '../_shared/auth.ts';
import { validateBody, validateQuery, userUpdateSchema, userRoleSchema, paginationSchema } from '../_shared/validation.ts';
import { createAuditLog } from '../_shared/audit.ts';
import * as response from '../_shared/responses.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const router = createRouter('/api-users');

// Additional schemas
const roleUpdateSchema = z.object({
  role: userRoleSchema,
});

const userListSchema = paginationSchema.extend({
  role: userRoleSchema.optional(),
  search: z.string().optional(),
});

// GET /profile - Get current user profile
router.get('/profile', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const supabase = getServiceClient();
  
  // Get profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', auth.user.id)
    .single();

  if (error) {
    return response.notFound('Profile not found');
  }

  // Get role separately
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', auth.user.id)
    .single();

  return response.success({
    ...profile,
    role: roleData?.role || 'client'
  });
});

// PATCH /profile - Update current user profile
router.patch('/profile', async (req: Request) => {
  const auth = await verifyAuth(req);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }

  const validation = await validateBody(req, userUpdateSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const supabase = getServiceClient();
  
  // Get existing profile for audit
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .single();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      ...validation.data,
      updated_at: new Date().toISOString()
    })
    .eq('id', auth.user.id)
    .select()
    .single();

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log
  await createAuditLog({
    user_id: auth.user.id,
    action: 'PROFILE_UPDATED',
    table_name: 'profiles',
    record_id: auth.user.id,
    old_data: existing || undefined,
    new_data: validation.data as Record<string, unknown>,
  });

  return response.success(profile);
});

// GET /list - List users (admin only)
router.get('/list', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const url = new URL(req.url);
  const validation = validateQuery(url, userListSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const params = validation.data as { page: number; limit: number; role?: string; search?: string };
  const { page, limit, role, search } = params;
  const supabase = getServiceClient();
  const offset = (page - 1) * limit;

  // Get profiles
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: profilesData, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return response.serverError(error.message);
  }

  // Get roles for all users
  const userIds = profilesData?.map(p => p.user_id) || [];
  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('user_id', userIds);

  // Create role lookup map
  const roleMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

  // Transform to include role at top level and filter by role if specified
  let users = profilesData?.map(u => ({
    ...u,
    role: roleMap.get(u.user_id) || 'client'
  })) || [];

  // Filter by role if specified
  if (role) {
    users = users.filter(u => u.role === role);
  }

  return response.success(users, {
    page,
    limit,
    total: count || 0,
    hasMore: (count || 0) > offset + limit
  });
});

// GET /:id - Get user by ID (admin/loan_officer)
router.get('/:id', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const supabase = getServiceClient();
  
  // Get profile - the ID might be profile.id or user_id depending on usage
  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.id)
    .single();

  // Try user_id if profile.id didn't match
  if (error) {
    const result = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', params.id)
      .single();
    profile = result.data;
    error = result.error;
  }

  if (error || !profile) {
    return response.notFound('User not found');
  }

  // Get role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', profile.user_id)
    .single();

  // Get loans
  const { data: loans } = await supabase
    .from('loans')
    .select('id, amount, status, created_at')
    .eq('user_id', profile.user_id);

  // Audit view
  await createAuditLog({
    user_id: auth.user.id,
    action: 'VIEW_USER',
    table_name: 'profiles',
    record_id: params.id,
  });

  return response.success({
    ...profile,
    role: roleData?.role || 'client',
    loans: loans || []
  });
});

// PATCH /:id/role - Update user role (admin only)
router.patch('/:id/role', async (req: Request, params: Record<string, string>) => {
  const auth = await verifyAuthWithRole(req, ['admin']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Admin access required');
  }

  const validation = await validateBody(req, roleUpdateSchema);
  if (!validation.success) {
    return response.badRequest(validation.error);
  }

  const { role } = validation.data as { role: string };
  const supabase = getServiceClient();

  // Prevent self-demotion for safety
  if (params.id === auth.user.id && role !== 'admin') {
    return response.conflict('Cannot change your own admin role');
  }

  // Get existing role
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', params.id)
    .single();

  // Upsert role
  const { error } = await supabase
    .from('user_roles')
    .upsert({
      user_id: params.id,
      role,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    return response.serverError(error.message);
  }

  // Audit log - critical operation
  await createAuditLog({
    user_id: auth.user.id,
    action: 'ROLE_CHANGED',
    table_name: 'user_roles',
    record_id: params.id,
    old_data: existingRole || undefined,
    new_data: { role },
  });

  return response.success({ 
    message: 'Role updated successfully',
    user_id: params.id,
    role 
  });
});

// GET /roles - List all available roles (staff only)
router.get('/roles', async (req: Request) => {
  const auth = await verifyAuthWithRole(req, ['admin', 'loan_officer']);
  if (!auth.success || !auth.user) {
    return response.unauthorized(auth.error);
  }
  if (!auth.allowed) {
    return response.forbidden('Staff access required');
  }

  const roles = [
    { id: 'admin', name: 'Administrator', description: 'Full system access' },
    { id: 'loan_officer', name: 'Loan Officer', description: 'Loan processing and approval' },
    { id: 'approver', name: 'Approver', description: 'Final loan approval authority' },
    { id: 'client', name: 'Client', description: 'Loan applicant' }
  ];

  return response.success(roles);
});

// Main handler
Deno.serve(async (req: Request) => {
  return router.handle(req);
});
