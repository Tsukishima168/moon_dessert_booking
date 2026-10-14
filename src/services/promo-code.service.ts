import { findAllPromoCodes, findPromoCodeById, hasPromoHistory, insertPromoCode, updatePromoCode, deletePromoCode, type PromoCodeRow } from '@/src/repositories/promo-code.repository'
import { normalizePromoConfig, PromotionInputError } from '@/src/lib/promotion-config'

export async function listPromoCodes(): Promise<PromoCodeRow[]> { return findAllPromoCodes() }
async function withDuplicateMessage<T>(work: () => Promise<T>): Promise<T> {
  try { return await work() } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') throw new PromotionInputError('優惠碼已存在。')
    throw error
  }
}
export async function createPromoCode(input: Record<string, unknown>): Promise<PromoCodeRow> {
  const payload = normalizePromoConfig(input)
  return withDuplicateMessage(() => insertPromoCode(payload))
}
export async function editPromoCode(input: Record<string, unknown>): Promise<PromoCodeRow> {
  if (typeof input.id !== 'string') throw new PromotionInputError('缺少優惠碼編號。')
  const existing = await findPromoCodeById(input.id)
  if (!existing) throw new PromotionInputError('找不到此優惠碼。')
  // Persist configuration only. Never accept used_count, owner fields or counters from the browser.
  const payload = normalizePromoConfig({ ...existing, ...input })
  if (payload.code !== existing.code && (Number(existing.used_count) > 0 || await hasPromoHistory(existing.id, existing.code))) throw new PromotionInputError('此優惠已有使用紀錄，請保留原代碼並新增活動。')
  if (payload.max_uses !== null && payload.max_uses < Number(existing.used_count || 0)) throw new PromotionInputError('總上限不能小於目前使用量；如需結束活動，請停用優惠碼。')
  return withDuplicateMessage(() => updatePromoCode(input.id as string, payload))
}
export async function removePromoCode(id: string): Promise<void> {
  const existing = await findPromoCodeById(id)
  if (existing && (Number(existing.used_count) > 0 || await hasPromoHistory(existing.id, existing.code))) throw new PromotionInputError('此優惠已有使用紀錄，請改為停用以保留資訊。')
  return deletePromoCode(id)
}
