import { syncOrderEventToN8n } from '@/lib/integrations/n8n'
import {
  sendOrderStatusNotification,
  type NotificationDeliveryState,
  type StatusNotificationChannel,
} from '@/lib/notifications'
import type { OrderItem } from '@/lib/supabase'
import { insertNotificationLog } from '@/src/repositories/notification-log.repository'

export interface OrderStatusSideEffectChannelResult {
  state: NotificationDeliveryState | 'queued'
  message: string
}

export type NotificationRetryTarget = 'all' | 'email' | 'discord' | 'n8n'

export interface OrderStatusSideEffectResult {
  triggerMode: 'status_change' | 'manual_retry'
  requestedChannel: NotificationRetryTarget
  statusChanged: boolean
  previousStatus: string
  currentStatus: string
  channels: {
    discord: OrderStatusSideEffectChannelResult
    email: OrderStatusSideEffectChannelResult
    n8n: OrderStatusSideEffectChannelResult
  }
  loggedAt?: string
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
  requestedChannel?: NotificationRetryTarget
}

export async function runOrderStatusSideEffects(
  input: OrderStatusSideEffectInput
): Promise<OrderStatusSideEffectResult> {
  const triggerMode = input.triggerMode ?? 'status_change'
  const requestedChannel = input.requestedChannel ?? 'all'
  const selectedChannels =
    requestedChannel === 'all'
      ? ['discord', 'email', 'n8n']
      : [requestedChannel]
  const selectedNotificationChannels = selectedChannels.filter(
    (channel): channel is StatusNotificationChannel =>
      channel === 'discord' || channel === 'email'
  )
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
    selectedChannels: selectedNotificationChannels,
  })

  const n8nWebhookUrl =
    process.env.N8N_ORDER_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_ORDER_WEBHOOK_URL

  let n8n: OrderStatusSideEffectChannelResult
  if (!selectedChannels.includes('n8n')) {
    n8n = {
      state: 'skipped',
      message: triggerMode === 'manual_retry' ? '本次未選擇重送 n8n' : '本次未啟用 n8n 同步',
    }
  } else if (!n8nWebhookUrl) {
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

  const result: OrderStatusSideEffectResult = {
    triggerMode,
    requestedChannel,
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

  try {
    const log = await insertNotificationLog({
      order_id: input.orderId,
      event_type: 'order.status_updated',
      trigger_mode: triggerMode,
      requested_channel: requestedChannel,
      previous_status: input.previousStatus,
      current_status: input.currentStatus,
      email_state: result.channels.email.state,
      email_message: result.channels.email.message,
      discord_state: result.channels.discord.state,
      discord_message: result.channels.discord.message,
      n8n_state: result.channels.n8n.state,
      n8n_message: result.channels.n8n.message,
    })

    return {
      ...result,
      loggedAt: log.created_at,
    }
  } catch (error) {
    console.error('[OrderStatusSideEffects] notification_logs 寫入失敗（不影響主流程）:', error)
    return result
  }
}
