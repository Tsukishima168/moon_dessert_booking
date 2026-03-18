import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getUserOrders } from '@/src/services/order.service';

export async function GET() {
  try {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await getUserOrders(user.id);

    return NextResponse.json(orders);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    console.error('查詢訂單錯誤:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
