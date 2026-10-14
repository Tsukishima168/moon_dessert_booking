import { createAdminClient } from '@/lib/supabase-admin'
import type { PromoConfig } from '@/src/lib/promotion-config'

export interface PromoCodeRow {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  valid_from: string
  valid_until: string | null
  is_active: boolean
  member_only: boolean
  per_member_limit: number | null
  used_count: number
  [key: string]: unknown
}

export type InsertPromoCodePayload = PromoConfig

export async function findPromoCodeById(id: string): Promise<PromoCodeRow | null> {
  const { data, error } = await createAdminClient().from('promo_codes').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as PromoCodeRow | null
}
export async function hasPromoHistory(id: string, code: string): Promise<boolean> {
  const db = createAdminClient()
  const [usage, orders] = await Promise.all([
    db.from('shop_promo_usages').select('id').eq('promo_code_id', id).limit(1),
    db.from('orders').select('order_id').eq('promo_code', code).eq('checkout_site', 'shop').limit(1),
  ])
  if (usage.error) throw usage.error
  if (orders.error) throw orders.error
  return !!(usage.data?.length || orders.data?.length)
}

/**
 * 查詢所有優惠碼，依建立時間降序
 * @returns PromoCodeRow 陣列
 */
export async function findAllPromoCodes(): Promise<PromoCodeRow[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as PromoCodeRow[]
}

/**
 * 新增優惠碼
 * @param payload - 優惠碼資料
 * @returns 新建的 PromoCodeRow
 * @throws 錯誤碼 23505 代表重複 code
 */
export async function insertPromoCode(
  payload: InsertPromoCodePayload
): Promise<PromoCodeRow> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('promo_codes')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as PromoCodeRow
}

/**
 * 更新優惠碼
 * @param id - 優惠碼 UUID
 * @param updateData - 要更新的欄位
 * @returns 更新後的 PromoCodeRow
 * @throws 錯誤碼 23505 代表重複 code
 */
export async function updatePromoCode(
  id: string,
  updateData: Partial<PromoConfig>
): Promise<PromoCodeRow> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('promo_codes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as PromoCodeRow
}

/**
 * 刪除優惠碼
 * @param id - 優惠碼 UUID
 */
export async function deletePromoCode(id: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('promo_codes')
    .delete()
    .eq('id', id)
  if (error) throw error
}
