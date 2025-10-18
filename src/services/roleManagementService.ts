import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError } from '@/utils/errorHandler';

export type AppRole = 'client' | 'loan_officer' | 'admin';

export interface RoleManagementResult {
  success: boolean;
  error?: string;
  roles?: AppRole[];
}

export interface UserRole {
  role: AppRole;
  created_at: string;
}

/**
 * Role Hierarchy Rules:
 * 0. Super Admin (anthnydklrk@gmail.com): Can have any role combination
 * 1. Client: Can only be a client (no multiple roles)
 * 2. Loan Officer: Can only be a loan officer (single role)
 * 3. Admin: Can be admin + loan_officer (but NOT client)
 */

/**
 * Assign a role to a user with hierarchy validation
 */
export async function assignUserRole(
  userId: string, 
  role: AppRole
): Promise<RoleManagementResult> {
  try {
    debugLog('🔐 Assigning role with validation', { userId, role });
    
    const { error } = await supabase.rpc('assign_user_role_with_validation', {
      target_user_id: userId,
      target_role: role
    });

    if (error) {
      debugLog('❌ Role assignment failed', error);
      return { success: false, error: error.message };
    }

    debugLog('✅ Role assigned successfully', { userId, role });
    return { success: true };
  } catch (error) {
    handleDatabaseError(error, 'assignUserRole', { userId, role });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Remove a role from a user with hierarchy validation
 */
export async function removeUserRole(
  userId: string, 
  role: AppRole
): Promise<RoleManagementResult> {
  try {
    debugLog('🗑️ Removing role with validation', { userId, role });
    
    const { error } = await supabase.rpc('remove_user_role', {
      target_user_id: userId,
      target_role: role
    });

    if (error) {
      debugLog('❌ Role removal failed', error);
      return { success: false, error: error.message };
    }

    debugLog('✅ Role removed successfully', { userId, role });
    return { success: true };
  } catch (error) {
    handleDatabaseError(error, 'removeUserRole', { userId, role });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Set all roles for a user (replaces existing roles)
 */
export async function setUserRoles(
  userId: string, 
  roles: AppRole[]
): Promise<RoleManagementResult> {
  try {
    debugLog('📝 Setting user roles', { userId, roles });
    
    const { error } = await supabase.rpc('set_user_roles', {
      target_user_id: userId,
      target_roles: roles
    });

    if (error) {
      debugLog('❌ Set roles failed', error);
      return { success: false, error: error.message };
    }

    debugLog('✅ Roles set successfully', { userId, roles });
    return { success: true, roles };
  } catch (error) {
    handleDatabaseError(error, 'setUserRoles', { userId, roles });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(
  userId: string
): Promise<{ success: boolean; roles?: UserRole[]; error?: string }> {
  try {
    debugLog('📋 Getting user roles', { userId });
    
    const { data, error } = await supabase.rpc('get_user_roles', {
      target_user_id: userId
    });

    if (error) {
      debugLog('❌ Get roles failed', error);
      return { success: false, error: error.message };
    }

    const roles = (data || []) as UserRole[];
    debugLog('✅ Roles retrieved successfully', { userId, roles });
    return { success: true, roles };
  } catch (error) {
    handleDatabaseError(error, 'getUserRoles', { userId });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Validate role hierarchy for a set of roles
 */
export async function validateRoleHierarchy(
  userId: string, 
  roles: AppRole[]
): Promise<{ success: boolean; valid?: boolean; error?: string }> {
  try {
    debugLog('✅ Validating role hierarchy', { userId, roles });
    
    const { data, error } = await supabase.rpc('validate_role_hierarchy', {
      target_user_id: userId,
      new_roles: roles
    });

    if (error) {
      debugLog('❌ Validation failed', error);
      return { success: false, error: error.message };
    }

    const valid = data as boolean;
    debugLog('✅ Validation completed', { userId, roles, valid });
    return { success: true, valid };
  } catch (error) {
    handleDatabaseError(error, 'validateRoleHierarchy', { userId, roles });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get allowed roles for a user based on current roles and hierarchy rules
 */
export function getAllowedRoles(currentRoles: AppRole[], userEmail?: string): {
  canAdd: AppRole[];
  canRemove: AppRole[];
  description: string;
} {
  const hasAdmin = currentRoles.includes('admin' as AppRole);
  const hasLoanOfficer = currentRoles.includes('loan_officer' as AppRole);
  const hasClient = currentRoles.includes('client' as AppRole);

  // Super Admin can have any combination
  if (userEmail === 'anthnydklrk@gmail.com') {
    return {
      canAdd: (['admin', 'loan_officer', 'client'] as AppRole[]).filter(role => !currentRoles.includes(role)),
      canRemove: currentRoles, // Super admin can remove any role
      description: 'Super Admin can have any role combination'
    };
  }

  // Client can only be client (no multiple roles)
  if (hasClient) {
    return {
      canAdd: [], // Client cannot add other roles
      canRemove: [], // Client must remain client
      description: 'Client can only have client role'
    };
  }

  // Loan Officer can only be loan officer (single role)
  if (hasLoanOfficer && !hasAdmin) {
    return {
      canAdd: [], // Loan Officer cannot add other roles
      canRemove: [], // Loan Officer must remain loan officer
      description: 'Loan Officer can only have loan officer role'
    };
  }

  // Admin can be admin + loan_officer (but NOT client)
  if (hasAdmin) {
    return {
      canAdd: hasLoanOfficer ? [] : ['loan_officer' as AppRole],
      canRemove: hasLoanOfficer ? ['loan_officer' as AppRole] : [], // Can remove loan_officer but not admin
      description: 'Admin can be admin + loan officer, but cannot be client'
    };
  }

  // No roles - can add any single role
  return {
    canAdd: ['admin', 'loan_officer', 'client'] as AppRole[],
    canRemove: [],
    description: 'No roles assigned - can add any role'
  };
}

/**
 * Check if a role operation is allowed
 */
export function isRoleOperationAllowed(
  currentRoles: AppRole[],
  operation: 'add' | 'remove',
  targetRole: AppRole
): { allowed: boolean; reason?: string } {
  const { canAdd, canRemove } = getAllowedRoles(currentRoles);

  if (operation === 'add') {
    if (canAdd.includes(targetRole)) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: `Cannot add ${targetRole} role due to hierarchy constraints` 
    };
  }

  if (operation === 'remove') {
    if (canRemove.includes(targetRole)) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: `Cannot remove ${targetRole} role due to hierarchy constraints` 
    };
  }

  return { allowed: false, reason: 'Invalid operation' };
}

// Export all functions
export default {
  assignUserRole,
  removeUserRole,
  setUserRoles,
  getUserRoles,
  validateRoleHierarchy,
  getAllowedRoles,
  isRoleOperationAllowed
};
