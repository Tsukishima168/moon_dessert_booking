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

/**
 * 更新單一設定值（upsert by setting_key）
 * @param settingKey - 設定鍵名
 * @param settingValue - 新設定值
 * @returns 更新後的 row
 */
export async function updateBusinessSetting(
  settingKey: string,
  settingValue: unknown
): Promise<{ setting_key: string; setting_value: unknown }> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('business_settings')
    .update({ setting_value: settingValue, updated_at: new Date().toISOString() })
    .eq('setting_key', settingKey)
    .select()
    .single()
  if (error) {
    console.error('updateBusinessSetting error:', error)
    throw error
  }
  return data as { setting_key: string; setting_value: unknown }
}
