import { createAdminClient } from '@/lib/supabase-admin'

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
  [key: string]: unknown
}

export interface InsertPromoCodePayload {
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  valid_from: string
  valid_until: string | null
  is_active: boolean
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
  updateData: Partial<PromoCodeRow>
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
