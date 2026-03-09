import { createClient } from '@/lib/supabase-server'

export interface UserProfile {
  id: string
  email: string | null
  display_name: string | null
  phone: string | null
  mbti_type: string | null
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
      .select('id, full_name, phone, mbti_type, created_at')
      .eq('id', userId)
      .single();

    if (error?.code === 'PGRST116') return null; // No rows found
    if (error) throw error;

    return {
      id: data.id,
      email: null, // profiles table doesn't have email, would need to JOIN auth.users
      display_name: data.full_name,
      phone: data.phone,
      mbti_type: data.mbti_type,
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
  // profiles 表無 email 欄位，需要透過 auth.users join
  // 目前作為 stub，訪客訂單應改由 phone 比對
  // 若需實裝，需要：
  // 1. 在 profiles 中添加 email 欄位
  // 2. 或使用 Supabase RPC 函數跨 schema 查詢

  console.warn('findUserByEmail: profiles table lacks email column, falling back to null');
  return null;
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
