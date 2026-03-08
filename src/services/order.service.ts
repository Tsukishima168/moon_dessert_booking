import type { Order, OrderItem, PromoCodeValidation } from '@/lib/supabase'
import { insertOrder } from '@/src/repositories/order.repository'
import { sendCustomerEmail, notifyNewOrder } from '@/lib/notifications'
import { syncOrderEventToN8n } from '@/lib/integrations/n8n'

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
export async function createOrder(
  input: CreateOrderInput,
  authUserId: string | null
): Promise<CreateOrderResult> {
  // 手機格式驗證
  const phoneRegex = /^[0-9]{8,12}$/
  if (!phoneRegex.test(input.phone.replace(/[\s-]/g, ''))) {
    throw new Error('手機號碼格式不正確')
  }

  // 金額標準化
  const finalPrice = input.final_price
    ? parseFloat(String(input.final_price))
    : parseFloat(String(input.total_price))
  const originalPrice = input.original_price
    ? parseFloat(String(input.original_price))
    : parseFloat(String(input.total_price))
  const discountAmount = input.discount_amount
    ? parseFloat(String(input.discount_amount))
    : 0
  const deliveryFee = input.delivery_fee
    ? parseFloat(String(input.delivery_fee))
    : 0

  const orderId = `ORD${Date.now()}`

  await insertOrder({
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
  })

  console.log(`成功建立訂單: ${orderId}`)

  // 通知觸發（fire-and-forget，不阻塞回應）
  // Phase 2: 改為 emit("order.created") event bus
  Promise.all([
    input.email
      ? sendCustomerEmail({
          to: input.email,
          customerName: input.customer_name,
          orderId,
          items: input.items,
          totalPrice: finalPrice,
          pickupTime: input.pickup_time,
          promoCode: input.promo_code,
          discountAmount,
          originalPrice,
          paymentDate: input.payment_date,
          deliveryMethod: (input.delivery_method as 'pickup' | 'delivery') ?? 'pickup',
          deliveryAddress: input.delivery_address ?? undefined,
          deliveryFee,
          deliveryNotes: input.delivery_notes ?? undefined,
        })
      : Promise.resolve(false),

    notifyNewOrder({
      orderId,
      customerName: input.customer_name,
      phone: input.phone,
      totalPrice: finalPrice,
      pickupTime: input.pickup_time,
      items: input.items,
      promoCode: input.promo_code,
      discountAmount,
      originalPrice,
      paymentDate: input.payment_date,
      deliveryMethod: (input.delivery_method as 'pickup' | 'delivery') ?? 'pickup',
      deliveryAddress: input.delivery_address ?? undefined,
      deliveryFee,
      deliveryNotes: input.delivery_notes ?? undefined,
      orderSource: 'shop',
    }),

    syncOrderEventToN8n('order.created', {
      order_id: orderId,
      status: 'pending',
      customer_name: input.customer_name,
      phone: input.phone,
      email: input.email ?? null,
      pickup_time: input.pickup_time,
      delivery_method: input.delivery_method ?? 'pickup',
      delivery_address: input.delivery_address ?? null,
      total_price: originalPrice,
      final_price: finalPrice,
      promo_code: input.promo_code ?? null,
      discount_amount: discountAmount,
      items: input.items,
    }),
  ]).catch((error) => {
    console.error('通知發送錯誤（不影響訂單）:', error)
  })

  return { orderId, finalPrice }
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
  // TODO: implement
  throw new Error('Not implemented')
}

/**
 * 查詢用戶的歷史訂單列表
 * @param userId - Supabase auth user ID
 * @returns Order 陣列
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  // TODO: implement
  throw new Error('Not implemented')
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
  // TODO: implement
  throw new Error('Not implemented')
}
