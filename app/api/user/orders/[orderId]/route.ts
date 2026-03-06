import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

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

    // 查詢訂單項目
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', params.orderId);

    return NextResponse.json({
      ...order,
      items: items || [],
    });
  } catch (error: any) {
    console.error('查詢訂單錯誤:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
