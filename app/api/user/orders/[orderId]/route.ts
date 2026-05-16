import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { USER_VISIBLE_CHECKOUT_SITES } from '@/src/lib/order-scope';

export const dynamic = 'force-dynamic';

const USER_ORDER_SELECT = [
  'id',
  'order_id',
  'customer_name',
  'phone',
  'email',
  'pickup_time',
  'items',
  'status',
  'created_at',
  'final_price',
  'original_price',
  'discount_amount',
  'promo_code',
  'delivery_method',
  'delivery_address',
  'delivery_fee',
  'delivery_notes',
  'checkout_site',
  'source_from',
].join(', ');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();

    // 取得當前用戶
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 查詢訂單
    const { data: order, error } = await supabase
      .from('orders')
      .select(USER_ORDER_SELECT)
      .eq('id', orderId)
      .eq('user_id', user.id)
      .in('checkout_site', USER_VISIBLE_CHECKOUT_SITES)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const typedOrder = order as unknown as Record<string, unknown> & { items?: unknown };

    // 目前正式下單流程是把 items 存在 orders.items JSON 欄位
    // 這裡直接回傳該欄位，避免依賴不存在或未同步的 order_items 表
    const items = Array.isArray(typedOrder.items) ? typedOrder.items : [];

    return NextResponse.json({
      ...typedOrder,
      items,
    });
  } catch (error: unknown) {
    console.error('查詢訂單錯誤:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch order';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
