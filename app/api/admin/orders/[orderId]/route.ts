import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server-auth';
import { supabase } from '@/lib/supabase';
import { syncOrderEventToN8n } from '@/lib/integrations/n8n';

const ALLOWED_STATUS = ['pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled'];

async function ensureAdmin() {
  const supabaseAuth = await createAuthClient();
  const {
    data: { session },
    error,
  } = await supabaseAuth.auth.getSession();

  if (error || !session) return false;

  const role = (session.user.app_metadata?.role || session.user.user_metadata?.role || '')
    .toString()
    .toLowerCase();

  return role === 'admin';
}

// PATCH /api/admin/orders/[orderId]
export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  const isAdmin = await ensureAdmin();
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { status } = await request.json();
    const orderId = params.orderId;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, message: '缺少訂單或狀態' }, { status: 400 });
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ success: false, message: '無效狀態' }, { status: 400 });
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('order_id', orderId)
      .select(
        'order_id,status,customer_name,phone,email,pickup_time,delivery_method,delivery_address,total_price,final_price,promo_code,discount_amount,items,updated_at'
      )
      .maybeSingle();

    if (error) throw error;

    if (updatedOrder) {
      void syncOrderEventToN8n('order.status_updated', {
        order_id: updatedOrder.order_id,
        status: updatedOrder.status,
        customer_name: updatedOrder.customer_name,
        phone: updatedOrder.phone,
        email: updatedOrder.email,
        pickup_time: updatedOrder.pickup_time,
        delivery_method: updatedOrder.delivery_method,
        delivery_address: updatedOrder.delivery_address,
        total_price: updatedOrder.total_price,
        final_price: updatedOrder.final_price,
        promo_code: updatedOrder.promo_code,
        discount_amount: updatedOrder.discount_amount,
        items: Array.isArray(updatedOrder.items) ? updatedOrder.items : [],
        updated_at: updatedOrder.updated_at,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新訂單狀態錯誤:', error);
    return NextResponse.json({ success: false, message: '更新失敗' }, { status: 500 });
  }
}
