import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import { SHOP_CHECKOUT_SITE } from '@/src/lib/order-scope';

export const dynamic = 'force-dynamic';

const USER_ORDER_SELECT = [
  'id',
  'order_id',
  'customer_name',
  'phone',
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
].join(', ');

export async function GET() {
  try {
    const supabase = createClient();

    // 取得當前用戶
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 使用 admin client 查詢用戶訂單（繞過 RLS）
    const adminClient = createAdminClient();
    const { data: orders, error } = await adminClient
      .from('orders')
      .select(USER_ORDER_SELECT)
      .eq('user_id', user.id)
      .eq('checkout_site', SHOP_CHECKOUT_SITE)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(orders || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    console.error('查詢訂單錯誤:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
