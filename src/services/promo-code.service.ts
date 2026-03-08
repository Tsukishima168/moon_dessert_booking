import {
  findAllPromoCodes,
  insertPromoCode,
  updatePromoCode,
  deletePromoCode,
  type PromoCodeRow,
  type InsertPromoCodePayload,
} from '@/src/repositories/promo-code.repository'

const DUPLICATE_CODE_ERROR = '23505'

export interface CreatePromoCodeInput {
  code: string
  description?: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount?: number
  max_uses?: number | null
  valid_from?: string
  valid_until?: string | null
  is_active?: boolean
}

export interface UpdatePromoCodeInput {
  id: string
  code?: string
  [key: string]: unknown
}

/**
 * 列出所有優惠碼
 */
export async function listPromoCodes(): Promise<PromoCodeRow[]> {
  return findAllPromoCodes()
}

/**
 * 新增優惠碼（code 強制轉大寫）
 * @param input - 優惠碼資料
 * @returns 新建的 PromoCodeRow
 * @throws Error('優惠碼已存在') 若 code 重複
 */
export async function createPromoCode(
  input: CreatePromoCodeInput
): Promise<PromoCodeRow> {
  const payload: InsertPromoCodePayload = {
    code: input.code.toUpperCase(),
    description: input.description ?? null,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    min_order_amount: input.min_order_amount ?? 0,
    max_uses: input.max_uses ?? null,
    valid_from: input.valid_from ?? new Date().toISOString(),
    valid_until: input.valid_until ?? null,
    is_active: input.is_active !== undefined ? input.is_active : true,
  }

  try {
    return await insertPromoCode(payload)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === DUPLICATE_CODE_ERROR
    ) {
      throw new Error('優惠碼已存在')
    }
    throw error
  }
}

/**
 * 更新優惠碼（若有更新 code 則強制轉大寫）
 * @param input - 含 id 的更新資料
 * @returns 更新後的 PromoCodeRow
 * @throws Error('優惠碼已存在') 若 code 重複
 */
export async function editPromoCode(
  input: UpdatePromoCodeInput
): Promise<PromoCodeRow> {
  const { id, ...updateData } = input

  if (updateData.code && typeof updateData.code === 'string') {
    updateData.code = updateData.code.toUpperCase()
  }

  try {
    return await updatePromoCode(id, updateData as Partial<PromoCodeRow>)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === DUPLICATE_CODE_ERROR
    ) {
      throw new Error('優惠碼已存在')
    }
    throw error
  }
}

/**
 * 刪除優惠碼
 * @param id - 優惠碼 UUID
 */
export async function removePromoCode(id: string): Promise<void> {
  return deletePromoCode(id)
}
