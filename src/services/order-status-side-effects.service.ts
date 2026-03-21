/**
 * 訂單狀態變更副作用服務（stub）
 * TODO: 實作完整的通知重送邏輯
 */

export type NotificationRetryTarget = 'all' | 'email' | 'discord' | 'n8n'

export interface OrderStatusSideEffectsInput {
  orderId: string
  customerName: string
  phone: string
  email?: string | null
  pickupTime: string
  deliveryMethod?: string | null
  deliveryAddress?: string | null
  totalPrice: number
  finalPrice?: number | null
  promoCode?: string | null
  discountAmount?: number | null
  items: unknown[]
  updatedAt?: string | null
  previousStatus: string
  currentStatus: string
  triggerMode: 'manual_retry' | 'auto'
  requestedChannel: NotificationRetryTarget
}

export async function runOrderStatusSideEffects(
  input: OrderStatusSideEffectsInput
): Promise<{ success: boolean; message: string }> {
  console.log('[OrderStatusSideEffects] Stub: 尚未實作通知重送邏輯', input.orderId, input.requestedChannel)
  return { success: false, message: '通知重送功能尚未實作' }
}
