import { syncOrderEventToN8n } from '@/lib/integrations/n8n'
import {
  sendOrderStatusNotification,
  type NotificationDeliveryState,
} from '@/lib/notifications'
import type { OrderItem } from '@/lib/supabase'

export interface OrderStatusSideEffectChannelResult {
  state: NotificationDeliveryState | 'queued'
  message: string
}

export interface OrderStatusSideEffectResult {
  triggerMode: 'status_change' | 'manual_retry'
  statusChanged: boolean
  previousStatus: string
  currentStatus: string
  channels: {
    discord: OrderStatusSideEffectChannelResult
    email: OrderStatusSideEffectChannelResult
    n8n: OrderStatusSideEffectChannelResult
  }
}

interface OrderStatusSideEffectInput {
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
  items?: OrderItem[]
  updatedAt?: string | null
  previousStatus: string
  currentStatus: string
  triggerMode?: 'status_change' | 'manual_retry'
}

export async function runOrderStatusSideEffects(
  input: OrderStatusSideEffectInput
): Promise<OrderStatusSideEffectResult> {
  const triggerMode = input.triggerMode ?? 'status_change'
  const notificationResult = await sendOrderStatusNotification({
    orderId: input.orderId,
    customerName: input.customerName,
    phone: input.phone,
    email: input.email ?? undefined,
    oldStatus: input.previousStatus,
    newStatus: input.currentStatus,
    pickupTime: input.pickupTime,
    deliveryMethod: input.deliveryMethod || 'pickup',
    items: input.items ?? [],
    manual: triggerMode === 'manual_retry',
  })

  const n8nWebhookUrl =
    process.env.N8N_ORDER_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_ORDER_WEBHOOK_URL

  let n8n: OrderStatusSideEffectChannelResult
  if (!n8nWebhookUrl) {
    n8n = {
      state: 'skipped',
      message: 'N8N webhook 未設定，已略過同步',
    }
  } else {
    void syncOrderEventToN8n('order.status_updated', {
      order_id: input.orderId,
      status: input.currentStatus,
      customer_name: input.customerName,
      phone: input.phone,
      email: input.email,
      pickup_time: input.pickupTime,
      delivery_method: input.deliveryMethod ?? undefined,
      delivery_address: input.deliveryAddress ?? undefined,
      total_price: input.totalPrice,
      final_price: input.finalPrice ?? undefined,
      promo_code: input.promoCode ?? undefined,
      discount_amount: input.discountAmount ?? undefined,
      items: input.items ?? [],
      updated_at: input.updatedAt ?? undefined,
    }).catch((error) => {
      console.error('[OrderStatusSideEffects] n8n 同步錯誤（不影響狀態更新）:', error)
    })

    n8n = {
      state: 'queued',
      message:
        triggerMode === 'manual_retry'
          ? '已手動觸發 n8n 同步，請至 executions 或 runtime logs 確認最終結果'
          : 'n8n 同步已啟動，請至 executions 或 runtime logs 確認最終結果',
    }
  }

  return {
    triggerMode,
    statusChanged: input.previousStatus !== input.currentStatus,
    previousStatus: input.previousStatus,
    currentStatus: input.currentStatus,
    channels: {
      discord: {
        state: notificationResult.discord.state,
        message: notificationResult.discord.message,
      },
      email: {
        state: notificationResult.email.state,
        message: notificationResult.email.message,
      },
      n8n,
    },
  }
}
