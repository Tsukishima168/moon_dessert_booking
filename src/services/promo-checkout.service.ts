import { createAdminClient } from '@/lib/supabase-admin'
import type { PromoCodeValidation } from '@/lib/supabase'
import { calculatePromoDiscount, formatPromoDiscount } from '@/src/lib/promotion-config'

export class PromotionUnavailableError extends Error {}
interface CheckoutPromo {
  id: string; code: string; description: string | null; discount_type: 'fixed' | 'percentage'; discount_value: number;
  min_order_amount: number | null; used_count: number | null; max_uses: number | null;
  valid_from: string | null; valid_until: string | null; is_active: boolean; member_only: boolean; per_member_limit: number | null;
}
const FIELDS = 'id, code, description, discount_type, discount_value, min_order_amount, used_count, max_uses, valid_from, valid_until, is_active, member_only, per_member_limit'
const unavailable = () => new PromotionUnavailableError('優惠服務暫時無法確認，請稍後再試，或先移除優惠碼。')

async function countMemberUses(promo: CheckoutPromo, userId: string): Promise<number> {
  const db = createAdminClient()
  const [usage, legacy] = await Promise.all([
    db.from('shop_promo_usages').select('order_id').eq('promo_code_id', promo.id).eq('user_id', userId).eq('state', 'reserved'),
    db.from('orders').select('order_id').eq('promo_code', promo.code).eq('user_id', userId).eq('checkout_site', 'shop'),
  ])
  if (usage.error || legacy.error) throw unavailable()
  return new Set([...(usage.data ?? []), ...(legacy.data ?? [])].map(row => row.order_id)).size
}

async function evaluatePromo(promo: CheckoutPromo, amount: number, userId: string | null, knownUses?: number): Promise<PromoCodeValidation> {
  const invalid = (message: string) => ({ valid: false, discount_amount: 0, final_amount: amount, message })
  const now = Date.now()
  if (!promo.is_active) return invalid('此優惠活動已停用。')
  if (promo.valid_from && new Date(promo.valid_from).getTime() > now) return invalid('此優惠碼尚未生效。')
  if (promo.valid_until && new Date(promo.valid_until).getTime() < now) return invalid('此優惠碼已過期。')
  if (promo.max_uses !== null && Number(promo.used_count ?? 0) >= promo.max_uses) return invalid('此優惠碼已達使用上限。')
  if (promo.member_only && !userId) return invalid('這是會員限定優惠，請先登入再使用。')
  if (promo.per_member_limit != null) {
    if (!userId) return invalid('請先登入使用此優惠。')
    if ((knownUses ?? await countMemberUses(promo, userId)) >= promo.per_member_limit) return invalid('你已達此優惠的使用次數上限。')
  }
  if (amount < Number(promo.min_order_amount ?? 0)) return invalid(`商品小計未達最低消費 NT$ ${promo.min_order_amount}。`)
  let discount: number
  try { discount = calculatePromoDiscount(promo.discount_type, Number(promo.discount_value), amount) }
  catch { return invalid('此優惠設定有誤，請聯繫我們確認。') }
  return { valid: true, discount_amount: discount, final_amount: amount - discount, message: '優惠碼套用成功。' }
}

export async function validateCheckoutPromo(code: string, amount: number, userId: string | null): Promise<PromoCodeValidation> {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000 || typeof code !== 'string' || code.length > 100) {
    return { valid: false, discount_amount: 0, final_amount: 0, message: '優惠碼或訂單小計格式不正確。' }
  }
  const { data, error } = await createAdminClient().from('promo_codes').select(FIELDS).eq('code', code.trim().toUpperCase()).maybeSingle()
  if (error) throw unavailable()
  if (!data) return { valid: false, discount_amount: 0, final_amount: amount, message: '找不到此優惠碼。' }
  return evaluatePromo(data as CheckoutPromo, amount, userId)
}

export async function reserveCheckoutPromo(code: string, amount: number, userId: string | null, orderId: string, discount: number): Promise<{ id: string }> {
  const { data, error } = await createAdminClient().rpc('reserve_shop_promo_usage', {
    p_code: code.trim().toUpperCase(), p_subtotal: amount, p_user_id: userId, p_order_id: orderId, p_expected_discount: discount,
  })
  if (error || !data) throw unavailable()
  if (!data.ok) throw new Error(data.reason || '此優惠暫時無法使用，請重新確認。')
  if (typeof data.id !== 'string') throw unavailable()
  return { id: data.id }
}
export async function releaseCheckoutPromo(id: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('release_shop_promo_usage', { p_id: id })
  return !error && data === true
}

export async function listMemberOffers(userId: string) {
  const { data, error } = await createAdminClient().from('promo_codes').select(FIELDS).eq('member_only', true).eq('is_active', true).order('valid_until', { ascending: true }).limit(100)
  if (error) throw unavailable()
  const db = createAdminClient()
  const [usage, legacy] = await Promise.all([
    db.from('shop_promo_usages').select('promo_code_id, order_id').eq('user_id', userId).eq('state', 'reserved'),
    db.from('orders').select('promo_code, order_id').eq('user_id', userId).eq('checkout_site', 'shop'),
  ])
  if (usage.error || legacy.error) throw unavailable()
  return Promise.all((data as CheckoutPromo[] ?? []).map(async promo => {
    const uses = new Set([...(usage.data ?? []).filter(row => row.promo_code_id === promo.id), ...(legacy.data ?? []).filter(row => row.promo_code === promo.code)].map(row => row.order_id)).size
    const result = await evaluatePromo(promo, Math.max(Number(promo.min_order_amount ?? 0), 1), userId, uses)
    return {
      id: promo.id, code: promo.code, description: promo.description, discount_label: formatPromoDiscount(promo.discount_type, Number(promo.discount_value)),
      min_order_amount: Number(promo.min_order_amount ?? 0), valid_until: promo.valid_until,
      used_count: uses, per_member_limit: promo.per_member_limit, available: result.valid, message: result.valid ? '結帳時輸入此碼即可使用。' : result.message,
    }
  }))
}
