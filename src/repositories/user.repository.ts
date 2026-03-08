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
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 依 email 查詢用戶 profile（訪客訂單比對用）
 * @param email - 用戶 email
 * @returns UserProfile，找不到時回傳 null
 */
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  // TODO: implement
  throw new Error('Not implemented')
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
  // TODO: implement
  throw new Error('Not implemented')
}
