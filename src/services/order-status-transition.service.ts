import {
  findOrderById,
  type AdminOrder,
  type UpdateOrderPayload,
  updateOrder,
} from '@/src/repositories/order.repository'
import {
  runOrderStatusSideEffects,
  type OrderStatusSideEffectResult,
} from '@/src/services/order-status-side-effects.service'

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`訂單 ${orderId} 不存在`)
    this.name = 'OrderNotFoundError'
  }
}

export interface UpdateAdminOrderWithStatusEffectsResult {
  previousOrder: AdminOrder
  updatedOrder: AdminOrder
  notificationResult: OrderStatusSideEffectResult
}

export function buildNoStatusChangeNotificationResult(
  currentStatus: string
): OrderStatusSideEffectResult {
  return {
    triggerMode: 'status_change',
    requestedChannel: 'all',
    statusChanged: false,
    previousStatus: currentStatus,
    currentStatus,
    channels: {
      discord: {
        state: 'skipped',
        message: '本次未變更狀態，不會重送 Discord 通知',
      },
      email: {
        state: 'skipped',
        message: '本次未變更狀態，不會重送客戶 Email',
      },
      n8n: {
        state: 'skipped',
        message: '本次未變更狀態，不會同步 n8n',
      },
    },
  }
}

export async function updateAdminOrderWithStatusEffects(
  orderId: string,
  payload: UpdateOrderPayload
): Promise<UpdateAdminOrderWithStatusEffectsResult> {
  const previousOrder = await findOrderById(orderId)
  if (!previousOrder) {
    throw new OrderNotFoundError(orderId)
  }

  const updatedOrder = await updateOrder(orderId, {
    ...payload,
    updated_at: new Date().toISOString(),
  })

  const statusWasProvided = Object.prototype.hasOwnProperty.call(payload, 'status')
  if (!statusWasProvided || payload.status === undefined || previousOrder.status === updatedOrder.status) {
    return {
      previousOrder,
      updatedOrder,
      notificationResult: buildNoStatusChangeNotificationResult(updatedOrder.status),
    }
  }

  return {
    previousOrder,
    updatedOrder,
    notificationResult: await runOrderStatusSideEffects({
      orderId: updatedOrder.order_id,
      customerName: updatedOrder.customer_name,
      phone: updatedOrder.phone,
      email: updatedOrder.email,
      pickupTime: updatedOrder.pickup_time,
      deliveryMethod: updatedOrder.delivery_method,
      deliveryAddress: updatedOrder.delivery_address,
      totalPrice: updatedOrder.total_price,
      finalPrice: updatedOrder.final_price,
      promoCode: updatedOrder.promo_code,
      discountAmount: updatedOrder.discount_amount,
      items: Array.isArray(updatedOrder.items) ? updatedOrder.items : [],
      updatedAt: updatedOrder.updated_at,
      previousStatus: previousOrder.status,
      currentStatus: updatedOrder.status,
      triggerMode: 'status_change',
      requestedChannel: 'all',
    }),
  }
}
