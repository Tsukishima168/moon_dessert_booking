import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin'
import { findOrderById } from '@/src/repositories/order.repository'
import { runOrderStatusSideEffects } from '@/src/services/order-status-side-effects.service'

// POST /api/admin/orders/[orderId]/notifications/resend - 手動重送訂單通知
export async function POST(
  _request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
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
    })

    return NextResponse.json({
      success: true,
      message: `已手動重送 ${order.order_id} 的通知`,
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
