import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../../_utils/ensureAdmin';
import { findOrderById, type UpdateOrderPayload } from '@/src/repositories/order.repository';
import { updateAdminOrderWithStatusEffects } from '@/src/services/order-status-transition.service';

const ALLOWED_STATUS = ['pending', 'paid', 'ready', 'completed', 'cancelled'];
const ALLOWED_PAYMENT_METHOD = ['cash', 'transfer', 'line_pay'];

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

// GET /api/admin/orders/[orderId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { orderId } = await params;
    const order = await findOrderById(orderId);
    if (!order) {
      return NextResponse.json({ success: false, message: '訂單不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('取得訂單錯誤:', error);
    return NextResponse.json({ success: false, message: '取得訂單失敗' }, { status: 500 });
  }
}

// PATCH /api/admin/orders/[orderId]
// 支援欄位：pickup_time, items, discount_amount, status, admin_notes, payment_method
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId } = await params;
    const existingOrder = await findOrderById(orderId);

    if (!existingOrder) {
      return NextResponse.json({ success: false, message: '訂單不存在' }, { status: 404 });
    }

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
    const payload: Record<string, unknown> = {};
    const allowed = [
      'pickup_time', 'items', 'discount_amount',
      'payment_method', 'status', 'admin_notes',
    ];
    for (const key of allowed) {
      if (key in body) payload[key] = body[key];
    }

    if (body.promo_code !== undefined && body.promo_code !== existingOrder.promo_code) {
      return NextResponse.json(
        { success: false, message: '優惠碼請由顧客結帳流程套用，後台不可直接修改' },
        { status: 400 }
      );
    }

    const nextItems = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(existingOrder.items)
        ? existingOrder.items
        : [];
    const nextDiscountAmount = parseNumber(
      payload.discount_amount,
      existingOrder.discount_amount ?? 0
    );
    const nextOriginalPrice = nextItems.reduce((sum, item) => {
      const price = parseNumber((item as { price?: unknown }).price, 0);
      const quantity = parseNumber((item as { quantity?: unknown }).quantity, 0);
      return sum + price * quantity;
    }, 0);
    const nextFinalPrice = Math.max(
      0,
      nextOriginalPrice - nextDiscountAmount + (existingOrder.delivery_fee ?? 0)
    );

    payload.original_price = nextOriginalPrice;
    payload.final_price = nextFinalPrice;
    payload.total_price = nextFinalPrice;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: false, message: '沒有要更新的欄位' }, { status: 400 });
    }

    const { updatedOrder, notificationResult } = await updateAdminOrderWithStatusEffects(
      orderId,
      payload as UpdateOrderPayload
    );

    return NextResponse.json({ success: true, data: updatedOrder, notification: notificationResult });
  } catch (error) {
    console.error('更新訂單錯誤:', error);
    return NextResponse.json({ success: false, message: '更新失敗' }, { status: 500 });
  }
}
