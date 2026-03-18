import { createClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { findOrdersByUserId } from '@/src/repositories/order.repository';
import { updateOrderStatus } from '@/src/repositories/order.repository';

type RouteContext = { params: { orderId: string } };

/**
 * GET /api/user/orders/[orderId]
 * 查詢特定訂單詳細資料（僅限本人）
 * orderId 為 UUID (orders.id)
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 查詢此用戶所有訂單後，比對 UUID（防止越權）
    const orders = await findOrdersByUserId(user.id);
    const order = orders.find(o => o.id === params.orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    console.error('[GET /api/user/orders/[orderId]] 錯誤:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/user/orders/[orderId]/cancel — 透過 action 欄位取消訂單
 * Body: { action: 'cancel' }
 * 僅允許取消 pending 狀態的訂單
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as unknown;
    const action = (body as { action?: unknown }).action;

    if (action !== 'cancel') {
      return NextResponse.json({ error: '不支援的操作' }, { status: 400 });
    }

    // 確認訂單屬於此用戶
    const orders = await findOrdersByUserId(user.id);
    const order = orders.find(o => o.id === params.orderId);

    if (!order) {
      return NextResponse.json({ error: '訂單不存在或無權限' }, { status: 404 });
    }

    // 只允許取消 pending 狀態的訂單
    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `無法取消此訂單（目前狀態：${order.status}），請聯繫店家` },
        { status: 422 }
      );
    }

    await updateOrderStatus(order.order_id, 'cancelled');

    return NextResponse.json({ success: true, message: '訂單已取消' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cancel order';
    console.error('[POST /api/user/orders/[orderId]] 錯誤:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
