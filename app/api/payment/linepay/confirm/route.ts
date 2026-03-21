/**
 * GET /api/payment/linepay/confirm?transactionId=xxx&orderId=xxx
 *
 * LINE Pay 付款完成後的回調端點（confirmUrl）。
 * LINE Pay 會帶著 transactionId 和 orderId 導向此 URL。
 * 向 LINE Pay 確認付款 → 更新訂單狀態 → 重定向到訂單完成頁。
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLinePayClient } from '@/lib/linepay';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('transactionId');
  const orderId = searchParams.get('orderId');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shop.kiwimu.com';

  if (!transactionId || !orderId) {
    return NextResponse.redirect(`${siteUrl}/order/error?reason=missing_params`);
  }

  try {
    // 從 DB 取得訂單金額
    const supabase = createAdminClient();
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('final_price, total_price, status')
      .eq('order_id', orderId)
      .single();

    if (orderErr || !order) {
      console.error('[LINE Pay confirm] 訂單不存在:', orderId);
      return NextResponse.redirect(`${siteUrl}/order/error?reason=order_not_found`);
    }

    // 避免重複確認
    if (['paid', 'ready', 'completed'].includes(order.status)) {
      return NextResponse.redirect(`${siteUrl}/order/success?orderId=${orderId}`);
    }

    const amount = Math.round(
      parseFloat(String(order.final_price ?? order.total_price ?? 0))
    );

    // 向 LINE Pay 確認付款
    const client = getLinePayClient();
    const result = await client.confirmPayment(transactionId, {
      amount,
      currency: 'TWD',
    });

    if (result.returnCode !== '0000') {
      console.error('[LINE Pay confirm] 確認失敗:', result);
      return NextResponse.redirect(
        `${siteUrl}/order/error?reason=confirm_failed&code=${result.returnCode}`
      );
    }

    // 更新訂單狀態
    // 這裡統一寫成 paid，避免進入系統其餘模組未收斂的 confirmed 狀態
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: 'line_pay',
        linepay_transaction_id: transactionId,
        payment_date: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    console.log(`[LINE Pay] 訂單 ${orderId} 付款確認成功，transactionId: ${transactionId}`);

    return NextResponse.redirect(`${siteUrl}/order/success?orderId=${orderId}`);
  } catch (error) {
    console.error('[LINE Pay confirm] error:', error);
    return NextResponse.redirect(`${siteUrl}/order/error?reason=server_error`);
  }
}
