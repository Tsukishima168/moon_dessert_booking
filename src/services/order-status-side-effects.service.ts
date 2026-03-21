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
  triggerMode: 'manual_retry' | 'auto' | 'status_change'
  requestedChannel: NotificationRetryTarget
}

export interface ChannelResult {
  state: 'sent' | 'skipped' | 'failed'
  message: string
}

export interface OrderStatusSideEffectResult {
  triggerMode: string
  requestedChannel: NotificationRetryTarget
  statusChanged: boolean
  previousStatus: string
  currentStatus: string
  channels: {
    discord: ChannelResult
    email: ChannelResult
    n8n: ChannelResult
  }
}

export async function runOrderStatusSideEffects(
  input: OrderStatusSideEffectsInput
): Promise<OrderStatusSideEffectResult> {
  console.log('[OrderStatusSideEffects] Stub: 尚未實作通知重送邏輯', input.orderId, input.requestedChannel)
  const skipped: ChannelResult = { state: 'skipped', message: '通知重送功能尚未實作' }
  return {
    triggerMode: input.triggerMode,
    requestedChannel: input.requestedChannel,
    statusChanged: input.previousStatus !== input.currentStatus,
    previousStatus: input.previousStatus,
    currentStatus: input.currentStatus,
    channels: { discord: skipped, email: skipped, n8n: skipped },
  }
}
