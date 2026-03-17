import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../../_utils/ensureAdmin';
import {
  findOrderById,
  type UpdateOrderPayload,
} from '@/src/repositories/order.repository';
import {
  findNotificationLogsByOrderId,
  type NotificationLog,
} from '@/src/repositories/notification-log.repository';
import {
  OrderNotFoundError,
  updateAdminOrderWithStatusEffects,
} from '@/src/services/order-status-transition.service';

const ALLOWED_STATUS = ['pending', 'paid', 'ready', 'completed', 'cancelled'];
const ALLOWED_PAYMENT_METHOD = ['cash', 'transfer', 'line_pay'];

// GET /api/admin/orders/[orderId]
export async function GET(
  _request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const order = await findOrderById(params.orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: '訂單不存在' }, { status: 404 });
    }
    let notificationLogs: NotificationLog[] = [];
    try {
      notificationLogs = await findNotificationLogsByOrderId(params.orderId);
    } catch (error) {
      console.warn('讀取 notification_logs 失敗，先回傳空陣列:', error);
    }
    return NextResponse.json({
      success: true,
      data: {
        ...order,
        notification_logs: notificationLogs,
      },
    });
  } catch (error) {
    console.error('取得訂單錯誤:', error);
    return NextResponse.json({ success: false, message: '取得訂單失敗' }, { status: 500 });
  }
}

// PATCH /api/admin/orders/[orderId]
// 支援欄位：pickup_time, items, promo_code, discount_amount, final_price,
//           original_price, total_price, status, admin_notes, payment_method
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const orderId = params.orderId;

    // 驗證 status（若傳入）
    if (body.status !== undefined && !ALLOWED_STATUS.includes(body.status)) {
      return NextResponse.json({ success: false, message: '無效狀態' }, { status: 400 });
    }

    // 驗證 payment_method（若傳入）
    if (
      body.payment_method !== undefined &&
      body.payment_method !== null &&
      !ALLOWED_PAYMENT_METHOD.includes(body.payment_method)
    ) {
      return NextResponse.json({ success: false, message: '無效付款方式' }, { status: 400 });
    }

    // 只取允許更新的欄位
    const payload: UpdateOrderPayload = {};
    const allowed: (keyof UpdateOrderPayload)[] = [
      'pickup_time', 'items', 'total_price', 'original_price',
      'final_price', 'discount_amount', 'promo_code',
      'payment_method', 'linepay_transaction_id', 'status', 'admin_notes',
    ];
    for (const key of allowed) {
      if (key in body) payload[key] = body[key];
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: false, message: '沒有要更新的欄位' }, { status: 400 });
    }

    const { updatedOrder, notificationResult } =
      await updateAdminOrderWithStatusEffects(orderId, payload);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      notification_result: notificationResult,
    });
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ success: false, message: '訂單不存在' }, { status: 404 });
    }
    console.error('更新訂單錯誤:', error);
    return NextResponse.json({ success: false, message: '更新失敗' }, { status: 500 });
  }
}
