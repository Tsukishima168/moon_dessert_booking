import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = createClient();

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
      .select('*')
      .eq('id', params.orderId)
      .eq('user_id', user.id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 目前正式下單流程是把 items 存在 orders.items JSON 欄位
    // 這裡直接回傳該欄位，避免依賴不存在或未同步的 order_items 表
    const items = Array.isArray(order.items) ? order.items : [];

    return NextResponse.json({
      ...order,
      items,
    });
  } catch (error: any) {
    console.error('查詢訂單錯誤:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
