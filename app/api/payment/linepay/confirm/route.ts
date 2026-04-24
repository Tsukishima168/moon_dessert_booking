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
import { SHOP_CHECKOUT_SITE } from '@/src/lib/order-scope';

export async function GET(request: NextRequest) {
  if (!process.env.LINEPAY_CHANNEL_ID || !process.env.LINEPAY_CHANNEL_SECRET) {
    return NextResponse.json(
      { success: false, message: '線上付款功能即將開放，目前請使用銀行轉帳付款' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('transactionId');
  const orderId = searchParams.get('orderId');

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    request.nextUrl.origin;

  if (!transactionId || !orderId) {
    return NextResponse.redirect(`${siteUrl}/order/error?reason=missing_params`);
  }

  try {
    // 從 DB 取得訂單金額
    const supabase = createAdminClient();
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('final_price, total_price, status, linepay_transaction_id')
      .eq('order_id', orderId)
      .eq('checkout_site', SHOP_CHECKOUT_SITE)
      .single();

    if (orderErr || !order) {
      console.error('[LINE Pay confirm] 訂單不存在:', orderId);
      return NextResponse.redirect(`${siteUrl}/order/error?reason=order_not_found`);
    }

    // 避免重複確認
    if (['paid', 'ready', 'completed'].includes(order.status)) {
      if (order.linepay_transaction_id === transactionId) {
        return NextResponse.redirect(`${siteUrl}/order/success?orderId=${orderId}`);
      }

      console.error('[LINE Pay confirm] 已付款訂單的 transactionId 不一致:', {
        orderId,
        expectedTransactionId: order.linepay_transaction_id,
        actualTransactionId: transactionId,
      });
      return NextResponse.redirect(`${siteUrl}/order/error?reason=transaction_mismatch`);
    }

    if (!order.linepay_transaction_id || order.linepay_transaction_id !== transactionId) {
      console.error('[LINE Pay confirm] transactionId 與訂單綁定不一致:', {
        orderId,
        expectedTransactionId: order.linepay_transaction_id,
        actualTransactionId: transactionId,
      });
      return NextResponse.redirect(`${siteUrl}/order/error?reason=transaction_mismatch`);
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

    if (result.returnCode !== '0000' || !result.info) {
      console.error('[LINE Pay confirm] 確認失敗:', result);
      return NextResponse.redirect(
        `${siteUrl}/order/error?reason=confirm_failed&code=${result.returnCode}`
      );
    }

    if (
      String(result.info.transactionId) !== transactionId ||
      result.info.orderId !== orderId
    ) {
      console.error('[LINE Pay confirm] LINE Pay 回傳的訂單綁定資訊不一致:', result.info);
      return NextResponse.redirect(`${siteUrl}/order/error?reason=transaction_mismatch`);
    }

    // 更新訂單狀態
    // 這裡統一寫成 paid，避免進入系統其餘模組未收斂的 confirmed 狀態
    // 使用 match({ status: 'pending' }) 確保只更新一次，防止重複 confirm race condition
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_method: 'line_pay',
        linepay_transaction_id: transactionId,
        payment_date: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('checkout_site', SHOP_CHECKOUT_SITE)
      .eq('status', 'pending')
      .eq('linepay_transaction_id', transactionId)
      .select('order_id')
      .maybeSingle();

    if (updateErr || !updatedOrder) {
      console.error(
        `[LINE Pay confirm] DB 更新失敗或未命中資料列，transactionId=${transactionId} orderId=${orderId}`,
        updateErr
      );
      return NextResponse.redirect(`${siteUrl}/order/error?reason=order_update_failed`);
    }

    console.log(`[LINE Pay] 訂單 ${orderId} 付款確認成功，transactionId: ${transactionId}`);

    return NextResponse.redirect(`${siteUrl}/order/success?orderId=${orderId}`);
  } catch (error) {
    console.error('[LINE Pay confirm] error:', error);
    return NextResponse.redirect(`${siteUrl}/order/error?reason=server_error`);
  }
}
