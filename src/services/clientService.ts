import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError } from '@/utils/errorHandler';

// Live profile columns only (avoid PGRST204 by excluding non-existent fields)
export type ProfileLiveColumns = Partial<{
  user_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  id_number: string;
  employment_status: string;
  monthly_income: number;
  verified: boolean;
  credit_score: number;
  risk_category: string;
  last_login: string; // ISO
  version: number;
  created_at: string; // ISO
  updated_at: string; // ISO
}>;

export async function getProfile(
  { userId }: { userId: string }
): Promise<{ success: boolean; profile?: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      debugLog('❌ getProfile error', error);
      return { success: false, error: error.message };
    }

    return { success: true, profile: data };
  } catch (error) {
    handleDatabaseError(error, 'getProfile', { userId });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function updateProfile(
  { userId, patch }: { userId: string; patch: ProfileLiveColumns }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Pick only allowed live keys
    const allowedKeys: (keyof ProfileLiveColumns)[] = [
      'first_name','last_name','phone_number','id_number','employment_status','monthly_income','verified','credit_score','risk_category','last_login','version','updated_at'
    ];
    const safePatch: Record<string, any> = {};
    for (const k of allowedKeys) {
      if (typeof patch[k] !== 'undefined') safePatch[k as string] = patch[k];
    }

    if (Object.keys(safePatch).length === 0) {
      return { success: true }; // nothing to update
    }

    const { error } = await supabase
      .from('profiles')
      .update(safePatch)
      .eq('user_id', userId);

    if (error) {
      debugLog('❌ updateProfile error', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    handleDatabaseError(error, 'updateProfile', { userId });
    return { success: false, error: 'Unexpected error occurred' };
  }
}
