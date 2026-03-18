import type { Order, OrderItem, PromoCodeValidation } from '@/lib/supabase'
import { validatePromoCode } from '@/lib/supabase'
import { insertOrder, findOrdersByUserId } from '@/src/repositories/order.repository'
import { EventBus } from '@/src/lib/event-bus'
import { createAdminClient } from '@/lib/supabase-admin'

export interface CreateOrderInput {
  customer_name: string
  phone: string
  email?: string
  pickup_time: string
  items: OrderItem[]
  total_price: string | number
  promo_code?: string
  discount_amount?: string | number
  original_price?: string | number
  final_price?: string | number
  payment_date?: string
  delivery_method?: string
  delivery_address?: string
  delivery_fee?: string | number
  delivery_notes?: string
  mbti_type?: string
  from_mbti_test?: boolean
  source_from?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  user_id?: string
  linepay_transaction_id?: string
}

export interface CreateOrderResult {
  orderId: string
  finalPrice: number
}

/**
 * 建立新訂單的完整業務流程：
 * 驗證手機格式 → 計算金額 → 生成 order_id → 寫入 DB → 觸發通知（fire-and-forget）
 * @param input - 前端送來的訂單資料（已通過 route 基本驗證）
 * @param authUserId - 從 supabase auth 取得的當前登入用戶 ID（未登入傳 null）
 * @returns 訂單 ID 與最終金額
 */
/**
 * 從 DB 查詢 menu_variants 的實際單價，重新計算訂單金額
 * 防止前端傳入偽造的 price
 */
async function recalculateItemsPrice(items: OrderItem[]): Promise<number> {
  if (items.length === 0) return 0

  const variantIds = items.map(item => item.id)
  const adminClient = createAdminClient()

  const { data: variants, error } = await adminClient
    .from('menu_variants')
    .select('id, price')
    .in('id', variantIds)

  if (error) throw error

  const priceMap = new Map<string, number>(
    (variants || []).map(v => {
      const rawPrice = String(v.price).replace(/[^0-9.]/g, '')
      return [String(v.id), rawPrice === '' ? 0 : Number(rawPrice)]
    })
  )

  let total = 0
  for (const item of items) {
    const unitPrice = priceMap.get(item.id)
    if (unitPrice === undefined) {
      throw new Error(`品項不存在或已下架：${item.name}`)
    }
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      throw new Error(`品項數量無效：${item.name}`)
    }
    total += unitPrice * item.quantity
  }
  return total
}

export async function createOrder(
  input: CreateOrderInput,
  authUserId: string | null
): Promise<CreateOrderResult> {
  // 手機格式驗證
  const phoneRegex = /^[0-9]{8,12}$/
  if (!phoneRegex.test(input.phone.replace(/[\s-]/g, ''))) {
    throw new Error('手機號碼格式不正確')
  }

  // 伺服器端重新計算商品小計，防止前端偽造價格
  const itemsSubtotal = await recalculateItemsPrice(input.items)

  // 伺服器端計算運費，防止前端偽造
  const method = input.delivery_method ?? 'pickup'
  const deliveryFee = method === 'pickup'
    ? 0
    : itemsSubtotal >= 2000 ? 0 : 150

  // 優惠碼折扣驗證（若有傳入）
  let discountAmount = 0
  if (input.promo_code) {
    const promoResult = await validatePromoCode(
      input.promo_code.toUpperCase().trim(),
      itemsSubtotal
    )
    if (!promoResult.valid) {
      throw new Error(promoResult.message || '優惠碼無效')
    }
    discountAmount = promoResult.discount_amount
  }

  // 以伺服器計算結果為準，前端傳入的 total_price 只作參考
  const originalPrice = itemsSubtotal + deliveryFee
  const finalPrice = Math.max(0, originalPrice - discountAmount)

  const orderId = `ORD${Date.now()}`

  const orderData = {
    order_id: orderId,
    customer_name: input.customer_name,
    phone: input.phone,
    email: input.email ?? null,
    pickup_time: input.pickup_time,
    items: input.items,
    total_price: finalPrice,
    original_price: originalPrice,
    final_price: finalPrice,
    discount_amount: discountAmount,
    promo_code: input.promo_code ?? null,
    payment_date: input.payment_date ?? null,
    linepay_transaction_id: input.linepay_transaction_id ?? null,
    delivery_method: input.delivery_method ?? 'pickup',
    delivery_address: input.delivery_address ?? null,
    delivery_fee: deliveryFee,
    delivery_notes: input.delivery_notes ?? null,
    mbti_type: input.mbti_type ?? null,
    from_mbti_test: !!input.from_mbti_test,
    source_from: input.source_from ?? 'shop',
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    utm_content: input.utm_content ?? null,
    utm_term: input.utm_term ?? null,
    user_id: input.user_id ?? authUserId,
    status: 'pending',
  } as const

  const createdOrder = await insertOrder(orderData)

  console.log(`成功建立訂單: ${createdOrder.order_id}`)

  // Phase 2: emit("order.created") event bus
  // 所有後續副作用（加點、通知、integration）都由 event handlers 處理
  // 此處改為 fire-and-forget emit，不阻塞回應
  EventBus.emit('order.created', {
    order: createdOrder,
    metadata: {
      createdAt: new Date().toISOString(),
      source: 'shop',
    },
  }).catch((error) => {
    console.error('事件發送錯誤（不影響訂單）:', error)
  })

  return { orderId: createdOrder.order_id, finalPrice }
}

/**
 * 驗證優惠碼並計算折扣金額
 * @param code - 優惠碼字串
 * @param subtotal - 訂單小計（未折扣）
 * @returns PromoCodeValidation 物件
 */
export async function applyPromoCode(
  code: string,
  subtotal: number
): Promise<PromoCodeValidation> {
  return validatePromoCode(code.toUpperCase().trim(), subtotal)
}

/**
 * 查詢用戶的歷史訂單列表
 * @param userId - Supabase auth user ID
 * @returns Order 陣列
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  return findOrdersByUserId(userId)
}

/**
 * 取消訂單（檢查狀態是否允許取消後再更新）
 * @param orderId - 訂單 ID
 * @param requesterId - 發起取消的 user ID（權限驗證用）
 */
export async function cancelOrder(
  orderId: string,
  requesterId: string
): Promise<void> {
  // TODO: implement — 需確認訂單屬於 requesterId 且狀態為 pending
  throw new Error('Not implemented')
}
