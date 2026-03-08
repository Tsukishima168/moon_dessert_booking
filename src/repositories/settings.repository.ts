import { createAdminClient } from '@/lib/supabase-admin'

/**
 * 從 business_settings 資料表讀取所有設定，轉換為 key-value map
 * 使用 admin client（繞過 RLS）供公開 API 讀取店家設定
 * @returns Record<string, unknown> 設定物件，失敗時回傳空物件
 */
export async function fetchBusinessSettings(): Promise<Record<string, unknown>> {
  const adminClient = createAdminClient()
  const { data: settings, error } = await adminClient
    .from('business_settings')
    .select('setting_key, setting_value')
    .order('setting_key')

  if (error) {
    console.error('fetchBusinessSettings error:', error)
    throw error
  }

  const result: Record<string, unknown> = {}
  ;(settings || []).forEach((s) => {
    result[s.setting_key] = s.setting_value
  })
  return result
}
