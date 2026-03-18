import { createClient } from '@/lib/supabase-server'

export interface UserProfile {
  id: string
  email: string | null
  display_name: string | null
  phone: string | null
  mbti_type: string | null
  first_site: string | null
  last_seen_at: string | null
  last_seen_site: string | null
  created_at: string
}

/**
 * 依 user ID 查詢用戶 profile
 * @param userId - Supabase auth user ID
 * @returns UserProfile，找不到時回傳 null
 */
export async function findUserById(userId: string): Promise<UserProfile | null> {
  const client = createClient();

  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, email, full_name, phone, mbti_type, first_site, last_seen_at, last_seen_site, created_at')
      .eq('id', userId)
      .single();

    if (error?.code === 'PGRST116') return null; // No rows found
    if (error) throw error;

    return {
      id: data.id,
      email: data.email,
      display_name: data.full_name,
      phone: data.phone,
      mbti_type: data.mbti_type,
      first_site: data.first_site,
      last_seen_at: data.last_seen_at,
      last_seen_site: data.last_seen_site,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error(`findUserById error for ${userId}:`, error);
    return null;
  }
}

/**
 * 依 email 查詢用戶 profile（訪客訂單比對用）
 * @param email - 用戶 email
 * @returns UserProfile，找不到時回傳 null
 *
 * NOTE: Requires email column in profiles table (需透過 Supabase custom claim 或 extension 添加)
 * For now, returns null as profiles table doesn't store email directly
 */
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const client = createClient();

  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, email, full_name, phone, mbti_type, first_site, last_seen_at, last_seen_site, created_at')
      .eq('email', email)
      .single();

    if (error?.code === 'PGRST116') return null;
    if (error) throw error;

    return {
      id: data.id,
      email: data.email,
      display_name: data.full_name,
      phone: data.phone,
      mbti_type: data.mbti_type,
      first_site: data.first_site,
      last_seen_at: data.last_seen_at,
      last_seen_site: data.last_seen_site,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error(`findUserByEmail error for ${email}:`, error);
    return null;
  }
}

/**
 * 更新用戶的 MBTI 類型
 * @param userId - Supabase auth user ID
 * @param mbtiType - MBTI 類型字串（如 "INFJ"）
 */
/**
 * 更新用戶最後活躍站台（Server-side 呼叫，用 userId 直接 UPDATE）
 */
export async function updateLastSeen(userId: string, site: string): Promise<void> {
  const client = createClient();

  try {
    const now = new Date().toISOString();
    const { error } = await client.rpc('update_last_seen_for_user', {
      p_user_id: userId,
      p_site: site,
      p_now: now,
    });

    if (error) throw error;
  } catch (error) {
    console.error(`updateLastSeen error for ${userId}:`, error);
  }
}

/**
 * 更新用戶的 MBTI 類型
 * @param userId - Supabase auth user ID
 * @param mbtiType - MBTI 類型字串（如 "INFJ"）
 */
export async function updateUserMbtiType(
  userId: string,
  mbtiType: string
): Promise<void> {
  const client = createClient();

  try {
    const { error } = await client
      .from('profiles')
      .update({ mbti_type: mbtiType })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error(`updateUserMbtiType error for ${userId}:`, error);
    throw new Error(`Failed to update MBTI type: ${error instanceof Error ? error.message : String(error)}`);
  }
}
