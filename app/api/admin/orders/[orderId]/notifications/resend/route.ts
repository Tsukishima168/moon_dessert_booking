import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin'
import { findOrderById } from '@/src/repositories/order.repository'
import {
  runOrderStatusSideEffects,
  type NotificationRetryTarget,
} from '@/src/services/order-status-side-effects.service'

function isValidTarget(value: unknown): value is NotificationRetryTarget {
  return value === 'all' || value === 'email' || value === 'discord' || value === 'n8n'
}

// POST /api/admin/orders/[orderId]/notifications/resend - 手動重送訂單通知
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const requestedChannel = body?.target ?? 'all'

    if (!isValidTarget(requestedChannel)) {
      return NextResponse.json(
        { success: false, message: '無效的通知通道' },
        { status: 400 }
      )
    }

    const order = await findOrderById(params.orderId)

    if (!order) {
      return NextResponse.json({ success: false, message: '訂單不存在' }, { status: 404 })
    }

    const notificationResult = await runOrderStatusSideEffects({
      orderId: order.order_id,
      customerName: order.customer_name,
      phone: order.phone,
      email: order.email,
      pickupTime: order.pickup_time,
      deliveryMethod: order.delivery_method,
      deliveryAddress: order.delivery_address,
      totalPrice: order.total_price,
      finalPrice: order.final_price,
      promoCode: order.promo_code,
      discountAmount: order.discount_amount,
      items: Array.isArray(order.items) ? order.items : [],
      updatedAt: order.updated_at,
      previousStatus: order.status,
      currentStatus: order.status,
      triggerMode: 'manual_retry',
      requestedChannel,
    })

    const selectedChannels =
      requestedChannel === 'all'
        ? Object.values(notificationResult.channels)
        : [notificationResult.channels[requestedChannel]]
    const hasFailure = selectedChannels.some((channel) => channel.state === 'failed')
    const allSkipped = selectedChannels.every((channel) => channel.state === 'skipped')

    return NextResponse.json({
      success: !hasFailure && !allSkipped,
      message: hasFailure
        ? `${order.order_id} 的通知重送未完全成功，請查看 notification_result`
        : allSkipped
          ? `${order.order_id} 的通知沒有實際送出，請查看 notification_result`
          : `已手動重送 ${order.order_id} 的${requestedChannel === 'all' ? '全部通知' : `${requestedChannel} 通知`}`,
      data: order,
      notification_result: notificationResult,
    })
  } catch (error) {
    console.error('手動重送訂單通知錯誤:', error)
    return NextResponse.json(
      { success: false, message: '重送通知失敗' },
      { status: 500 }
    )
  }
}
