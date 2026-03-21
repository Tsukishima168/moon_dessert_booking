/**
 * Email 通知事件監聽器
 *
 * 由 EventBus 自動觸發，無需手動呼叫。
 * 冪等設計：缺 email 欄位時靜默跳過，不拋錯。
 */

import { sendCustomerEmail, sendOrderStatusNotification } from '@/lib/notifications'
import type { Order } from '@/lib/supabase'

/**
 * order.created 事件監聽器 — 發送訂單確認信給客戶
 * @param payload - { order: Order }
 */
export async function handleOrderCreatedEmail(
  payload: Record<string, unknown>
): Promise<void> {
  const order = payload.order as (Order & {
    email?: string | null
    payment_date?: string | null
    delivery_method?: string | null
    delivery_address?: string | null
    delivery_fee?: number | null
    delivery_notes?: string | null
  }) | undefined

  if (!order?.email) {
    // 無 email 欄位屬正常情境，靜默跳過
    return
  }

  try {
    await sendCustomerEmail({
      to: order.email,
      customerName: order.customer_name,
      orderId: order.order_id,
      items: Array.isArray(order.items) ? order.items : [],
      totalPrice: order.final_price ?? order.total_price,
      pickupTime: order.pickup_time,
      promoCode: order.promo_code ?? undefined,
      discountAmount: order.discount_amount ?? undefined,
      originalPrice: order.original_price ?? undefined,
      paymentDate: order.payment_date ?? undefined,
      deliveryMethod: (order.delivery_method as 'pickup' | 'delivery' | undefined) ?? 'pickup',
      deliveryAddress: order.delivery_address ?? undefined,
      deliveryFee: order.delivery_fee ?? undefined,
      deliveryNotes: order.delivery_notes ?? undefined,
    })
    console.log(`[EmailHandler] 訂單確認信發送成功 → ${order.email} (${order.order_id})`)
  } catch (error) {
    console.error('[EmailHandler] 訂單確認信發送失敗', order.order_id, error)
    // 不 throw：email 是 fire-and-forget，失敗不阻塞訂單流程
  }
}

/**
 * order.status_updated 事件監聽器 — 發送狀態變更通知（ready / cancelled 才寄信）
 * @param payload - { order: Order, oldStatus: string, newStatus: string }
 */
export async function handleOrderStatusUpdatedEmail(
  payload: Record<string, unknown>
): Promise<void> {
  const order = payload.order as (Order & { email?: string | null }) | undefined
  const oldStatus = payload.oldStatus as string | undefined
  const newStatus = payload.newStatus as string | undefined

  if (!order || !oldStatus || !newStatus) {
    console.warn('[EmailHandler] order.status_updated event missing required fields')
    return
  }

  try {
    await sendOrderStatusNotification({
      orderId: order.order_id,
      customerName: order.customer_name,
      oldStatus,
      newStatus,
      email: order.email ?? undefined,
      phone: order.phone ?? undefined,
      pickupTime: order.pickup_time ?? undefined,
      deliveryMethod: (payload.deliveryMethod as string | undefined) ?? undefined,
    })
    console.log(
      `[EmailHandler] 狀態通知完成 → ${order.order_id} (${oldStatus} → ${newStatus})`
    )
  } catch (error) {
    console.error('[EmailHandler] 狀態通知發送失敗', order.order_id, error)
    // 不 throw：通知失敗不影響狀態更新
  }
}
