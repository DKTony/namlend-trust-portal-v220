import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError } from '@/utils/errorHandler';

export type AppRole = 'client' | 'loan_officer' | 'admin';

export async function getProfilesWithRoles(
  params: { search?: string; role?: AppRole; limit?: number; offset?: number }
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('get_profiles_with_roles_admin', {
      p_search_term: params.search ?? null,
      p_role_filter: params.role ?? null,
      p_limit: params.limit ?? 100,
      p_offset: params.offset ?? 0
    });

    if (error) {
      debugLog('❌ getProfilesWithRolesAdmin error', error);
      return { success: false, error: error.message };
    }

    return { success: true, results: data || [] };
  } catch (error) {
    handleDatabaseError(error, 'getProfilesWithRolesAdmin', { params });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function listUserRoles(
  { userId }: { userId: string }
): Promise<{ success: boolean; roles?: AppRole[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .order('role', { ascending: true });

    if (error) {
      debugLog('❌ listUserRoles error', error);
      return { success: false, error: error.message };
    }

    const roles = (data || []).map((r: any) => r.role as AppRole);
    return { success: true, roles };
  } catch (error) {
    handleDatabaseError(error, 'listUserRoles', { userId });
    return { success: false, error: 'Unexpected error occurred' };
  }
}
