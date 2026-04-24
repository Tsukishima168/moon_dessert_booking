/**
 * POST /api/payment/linepay/request
 *
 * 發起 LINE Pay 付款請求。
 * 前端呼叫後取得 paymentUrl，導向 LINE Pay 付款頁面。
 *
 * Request body:
 *   orderId      - 訂單 ID（已在 DB 建立的訂單）
 *   amount       - 付款金額（整數 NTD）
 *   items        - 商品列表 [{ name, quantity, price }]
 *
 * Response:
 *   { success: true, paymentUrl: string }
 *   { success: false, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLinePayClient, type LinePayRequestBody } from '@/lib/linepay';
import { createAdminClient } from '@/lib/supabase-admin';
import { SHOP_CHECKOUT_SITE } from '@/src/lib/order-scope';

interface RequestItem {
  name: string;
  quantity: number;
  price: number;
}

function isValidRequestItem(item: unknown): item is RequestItem {
  if (!item || typeof item !== 'object') return false;

  const c = item as Record<string, unknown>;

  return (
    typeof c['name'] === 'string' &&
    c['name'].trim().length > 0 &&
    typeof c['quantity'] === 'number' &&
    Number.isInteger(c['quantity']) &&
    (c['quantity'] as number) > 0 &&
    typeof c['price'] === 'number' &&
    Number.isFinite(c['price']) &&
    (c['price'] as number) >= 0
  );
}

export async function POST(request: NextRequest) {
  if (!process.env.LINEPAY_CHANNEL_ID || !process.env.LINEPAY_CHANNEL_SECRET) {
    return NextResponse.json(
      { success: false, message: '線上付款功能即將開放，目前請使用銀行轉帳付款' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { orderId, amount, items } = body as {
      orderId: string;
      amount?: number;
      items?: RequestItem[];
    };

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: '缺少必要欄位：orderId' },
        { status: 400 }
      );
    }

    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      return NextResponse.json(
        { success: false, message: '付款金額格式錯誤' },
        { status: 400 }
      );
    }

    // 驗證訂單存在且尚未付款
    const supabase = createAdminClient();
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_id, final_price, total_price, payment_method, status, items, linepay_transaction_id')
      .eq('order_id', orderId)
      .eq('checkout_site', SHOP_CHECKOUT_SITE)
      .single();

    if (orderErr || !order) {
      return NextResponse.json(
        { success: false, message: '找不到訂單' },
        { status: 404 }
      );
    }

    if (['paid', 'ready', 'completed'].includes(order.status)) {
      return NextResponse.json(
        { success: false, message: '此訂單已付款，無法重複發起 LINE Pay' },
        { status: 409 }
      );
    }

    const expectedAmount = Math.round(
      Number(order.final_price ?? order.total_price ?? 0)
    );

    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: '訂單金額無效，請聯繫客服' },
        { status: 400 }
      );
    }

    if (amount !== undefined && Math.round(amount) !== expectedAmount) {
      return NextResponse.json(
        { success: false, message: '付款金額與訂單不一致，請重新整理後再試' },
        { status: 400 }
      );
    }

    const normalizedItems = Array.isArray(order.items)
      ? order.items.filter(isValidRequestItem)
      : [];

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { success: false, message: '訂單品項資料無效，無法發起付款' },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
      request.nextUrl.origin;

    const payload: LinePayRequestBody = {
      amount: expectedAmount,
      currency: 'TWD',
      orderId,
      packages: [
        {
          id: orderId,
          amount: expectedAmount,
          name: 'Moon Moon Dessert 訂單',
          products: normalizedItems.map((item, idx) => ({
            id: `item_${idx}`,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      ],
      redirectUrls: {
        confirmUrl: `${siteUrl}/api/payment/linepay/confirm`,
        cancelUrl: `${siteUrl}/order/cancel?orderId=${orderId}`,
      },
      options: {
        payment: { capture: true },
        display: { locale: 'zh_TW' },
      },
    };

    const client = getLinePayClient();
    const result = await client.requestPayment(payload);

    if (result.returnCode !== '0000' || !result.info) {
      console.error('[LINE Pay] 發起付款失敗:', result);
      return NextResponse.json(
        { success: false, message: `LINE Pay 錯誤：${result.returnMessage}` },
        { status: 502 }
      );
    }

    // 必須先成功寫回 transactionId，confirm 才能驗證 LINE Pay 回調是否屬於這張訂單
    const { data: updatedOrder, error: persistErr } = await supabase
      .from('orders')
      .update({
        payment_method: 'line_pay',
        linepay_transaction_id: String(result.info.transactionId),
      })
      .eq('order_id', orderId)
      .eq('checkout_site', SHOP_CHECKOUT_SITE)
      .eq('status', 'pending')
      .select('order_id')
      .maybeSingle();

    if (persistErr || !updatedOrder) {
      console.error('[LINE Pay] 無法寫回 transactionId:', persistErr);
      return NextResponse.json(
        { success: false, message: '無法建立付款流程，請稍後再試' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: result.info.paymentUrl.web,
      transactionId: result.info.transactionId,
    });
  } catch (error) {
    console.error('[LINE Pay] request error:', error);
    const message = error instanceof Error ? error.message : 'LINE Pay 連線失敗';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
