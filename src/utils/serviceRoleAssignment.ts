import { supabase } from '@/integrations/supabase/client';

// Assign role using service role privileges
export const assignRoleWithServiceRole = async (userId: string, role: 'admin' | 'loan_officer' | 'client') => {
  console.log(`🔐 Assigning role "${role}" to user ${userId} via Edge Function...`);
  try {
    const { data, error } = await supabase.functions.invoke('admin-assign-role', {
      body: { target_user_id: userId, target_role: role }
    });

    if (error) {
      console.error('❌ Edge Function role assignment failed, attempting RPC fallback:', error);
      // Fallback: SECURITY DEFINER RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('assign_user_role', {
        target_user_id: userId,
        target_role: role
      });
      if (rpcError) {
        console.error('❌ RPC fallback failed:', rpcError);
        return { success: false, error: rpcError.message };
      }
      console.log('✅ RPC fallback succeeded:', rpcData);
      return { success: true, role: { user_id: userId, role } } as any;
    }

    return { success: true, role: { user_id: userId, role } } as any;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Use the secure function approach
export const assignRoleViaFunction = async (userId: string, role: 'admin' | 'loan_officer' | 'client') => {
  // Backward compatible alias; both use Edge Function now
  return assignRoleWithServiceRole(userId, role);
};

// Assign specific user as client using service role
export const makeUserFrontendClientSecure = async () => {
  const userId = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1';
  console.log(`🎯 Making user ${userId} a frontend client via Edge Function...`);
  return await assignRoleWithServiceRole(userId, 'client');
};

// Make functions available globally for console use
if (typeof window !== 'undefined' && import.meta.env.VITE_DEBUG_TOOLS === 'true') {
  (window as any).assignRoleWithServiceRole = assignRoleWithServiceRole;
  (window as any).assignRoleViaFunction = assignRoleViaFunction;
  (window as any).makeUserFrontendClientSecure = makeUserFrontendClientSecure;
  console.log('🔐 Admin role assignment tools available via Edge Function (debug mode).');
}

export default { assignRoleWithServiceRole, assignRoleViaFunction, makeUserFrontendClientSecure };
