import { createAdminClient } from '@/lib/supabase-admin'

export interface BannerRow {
  id: string
  title: string
  description: string | null
  image_url: string | null
  link_url: string | null
  link_text: string
  background_color: string
  text_color: string
  is_active: boolean
  priority: number
  display_type: string
  start_date: string | null
  end_date: string | null
  [key: string]: unknown
}

export interface InsertBannerPayload {
  title: string
  description: string | null
  image_url: string | null
  link_url: string | null
  link_text: string
  background_color: string
  text_color: string
  is_active: boolean
  priority: number
  display_type: string
  start_date: string | null
  end_date: string | null
}

/**
 * 查詢所有 Banner（含未啟用），依 priority 降序、建立時間降序
 * @returns BannerRow 陣列
 */
export async function findAllBanners(): Promise<BannerRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('banners')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as BannerRow[]
}

/**
 * 新增 Banner
 * @param payload - Banner 資料
 * @returns 新建的 BannerRow
 */
export async function insertBanner(
  payload: InsertBannerPayload
): Promise<BannerRow> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('banners')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as BannerRow
}

/**
 * 更新 Banner
 * @param id - Banner UUID
 * @param updateData - 要更新的欄位（含 updated_at）
 * @returns 更新後的 BannerRow
 */
export async function updateBanner(
  id: string,
  updateData: Partial<BannerRow> & { updated_at: string }
): Promise<BannerRow> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('banners')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as BannerRow
}

/**
 * 刪除 Banner
 * @param id - Banner UUID
 */
export async function deleteBanner(id: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('banners')
    .delete()
    .eq('id', id)
  if (error) throw error
}
