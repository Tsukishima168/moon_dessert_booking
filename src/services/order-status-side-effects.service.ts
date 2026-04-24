import {
  sendOrderStatusNotification,
  type OrderStatusNotificationResult,
  type StatusNotificationChannel,
} from '@/lib/notifications'
import { syncOrderEventToN8n } from '@/lib/integrations/n8n'
import type { OrderItem } from '@/lib/supabase'

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

function buildSkipped(message: string): ChannelResult {
  return { state: 'skipped', message }
}

function normalizeItems(items: unknown[]): OrderItem[] {
  return items
    .filter((item): item is OrderItem => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<OrderItem>
      return (
        typeof candidate.name === 'string' &&
        typeof candidate.quantity === 'number' &&
        typeof candidate.price === 'number'
      )
    })
    .map((item, index) => ({
      id: item.id ?? `order-item-${index}`,
      name: item.name,
      variant_name: item.variant_name,
      quantity: item.quantity,
      price: item.price,
    }))
}

function extractNotificationChannels(
  requestedChannel: NotificationRetryTarget
): StatusNotificationChannel[] {
  if (requestedChannel === 'email') return ['email']
  if (requestedChannel === 'discord') return ['discord']
  return ['discord', 'email']
}

async function sendStatusNotifications(
  input: OrderStatusSideEffectsInput
): Promise<OrderStatusNotificationResult | null> {
  if (input.requestedChannel === 'n8n') {
    return null
  }

  return sendOrderStatusNotification({
    orderId: input.orderId,
    customerName: input.customerName,
    oldStatus: input.previousStatus,
    newStatus: input.currentStatus,
    email: input.email ?? undefined,
    phone: input.phone,
    pickupTime: input.pickupTime,
    deliveryMethod: input.deliveryMethod ?? undefined,
    items: normalizeItems(input.items),
    manual: input.triggerMode === 'manual_retry',
    selectedChannels: extractNotificationChannels(input.requestedChannel),
  })
}

export async function runOrderStatusSideEffects(
  input: OrderStatusSideEffectsInput
): Promise<OrderStatusSideEffectResult> {
  const baseSkipped =
    input.triggerMode === 'manual_retry'
      ? '本次未選擇此通知通道'
      : '本次未觸發此通知通道'

  const notificationResult = await sendStatusNotifications(input)

  let n8n: ChannelResult = buildSkipped(baseSkipped)
  if (input.requestedChannel === 'all' || input.requestedChannel === 'n8n') {
    const n8nSent = await syncOrderEventToN8n('order.status_updated', {
      order_id: input.orderId,
      status: input.currentStatus,
      customer_name: input.customerName,
      phone: input.phone,
      email: input.email ?? null,
      pickup_time: input.pickupTime,
      delivery_method: input.deliveryMethod ?? undefined,
      delivery_address: input.deliveryAddress ?? null,
      total_price: input.totalPrice,
      final_price: input.finalPrice ?? undefined,
      promo_code: input.promoCode ?? null,
      discount_amount: input.discountAmount ?? undefined,
      items: normalizeItems(input.items),
      source: 'shop',
      updated_at: input.updatedAt ?? new Date().toISOString(),
    })

    n8n = n8nSent
      ? {
          state: 'sent',
          message:
            input.triggerMode === 'manual_retry'
              ? 'n8n 同步已手動重送'
              : 'n8n 同步已送出',
        }
      : {
          state: process.env.N8N_ORDER_WEBHOOK_URL ? 'failed' : 'skipped',
          message: process.env.N8N_ORDER_WEBHOOK_URL
            ? 'n8n webhook 未成功送達，請查看 runtime logs'
            : 'n8n webhook 未設定，已略過',
        }
  }

  const discord =
    notificationResult?.discord ??
    buildSkipped(baseSkipped)
  const email =
    notificationResult?.email ??
    buildSkipped(baseSkipped)

  return {
    triggerMode: input.triggerMode,
    requestedChannel: input.requestedChannel,
    statusChanged: input.previousStatus !== input.currentStatus,
    previousStatus: input.previousStatus,
    currentStatus: input.currentStatus,
    channels: { discord, email, n8n },
  }
}
