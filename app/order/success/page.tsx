import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

import { ClearPendingOrder } from '@/components/checkout/clear-pending-order';
import { PurchaseTracker } from '@/components/checkout/purchase-tracker';
import { findOrderSuccessSummary } from '@/src/repositories/order.repository';
import { SHOP_CHECKOUT_SITE } from '@/src/lib/order-scope';
import { verifyOrderSuccessToken } from '@/src/lib/order-success-token';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const PAID_STATUSES = new Set(['paid', 'ready', 'completed']);

interface OrderSuccessPageProps {
  searchParams?: Promise<{
    orderId?: string;
    t?: string;
  }>;
}

/**
 * token 驗不過時的最後一道授權管道：已登入使用者若正是這筆訂單的本人（user_id 相符），
 * 仍可看到自己的訂單，滿足「既有登入使用者不能被擋」的相容性要求。
 * 訪客訂單（user_id 為 null）或未登入一律回傳 false，交由呼叫端 fail-closed。
 */
async function isOwnedByCurrentSession(orderUserId: string | null): Promise<boolean> {
  if (!orderUserId) return false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user && user.id === orderUserId;
  } catch (error) {
    console.error('order/success session fallback 檢查失敗:', error);
    return false;
  }
}

export default async function OrderSuccessPage({
  searchParams,
}: OrderSuccessPageProps) {
  const { orderId, t } = (await searchParams) ?? {};

  if (!orderId) {
    redirect('/order/error?reason=missing_params');
  }

  let order: Awaited<ReturnType<typeof findOrderSuccessSummary>> = null;
  try {
    order = await findOrderSuccessSummary(orderId, SHOP_CHECKOUT_SITE);
  } catch (error) {
    console.error('findOrderSuccessSummary error:', error);
    order = null;
  }

  if (!order) {
    redirect('/order/error?reason=order_not_found');
  }

  // IDOR 修復：這頁過去僅憑可枚舉／可能外流的 orderId 查詢就直接顯示訂單內容。
  // 現在需要「短時效簽章 token 驗證通過」或「登入使用者本人擁有此訂單」兩者之一，
  // fail-closed：兩者都不成立就不顯示任何訂單欄位，導去友善錯誤頁。
  const tokenResult = verifyOrderSuccessToken(orderId, t);
  const authorized = tokenResult.valid || (await isOwnedByCurrentSession(order.user_id));

  if (!authorized) {
    redirect('/order/error?reason=link_expired');
  }

  if (order.payment_method !== 'line_pay' || !PAID_STATUSES.has(order.status)) {
    redirect('/order/error?reason=payment_not_verified');
  }

  const paidAtLabel = order.payment_date
    ? new Date(order.payment_date).toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
      <ClearPendingOrder />
      <PurchaseTracker
        transactionId={order.order_id}
        value={order.final_price ?? 0}
        items={order.items ?? []}
      />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <CheckCircle className="w-12 h-12 text-moon-accent mx-auto" />
          <h2 className="brand-title text-xl">付款成功</h2>
          <p className="brand-eyebrow">PAYMENT CONFIRMED</p>
        </div>

        <div className="border border-moon-border/30 p-5 space-y-3 bg-moon-dark/40">
          <div className="flex justify-between text-sm">
            <span className="text-moon-muted">訂單編號</span>
            <span className="text-moon-accent font-mono tracking-widest">{order.order_id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-moon-muted">付款狀態</span>
            <span className="text-moon-text uppercase tracking-widest">{order.status}</span>
          </div>
          {paidAtLabel ? (
            <div className="flex justify-between text-sm">
              <span className="text-moon-muted">確認時間</span>
              <span className="text-moon-text">{paidAtLabel}</span>
            </div>
          ) : null}
          <p className="text-xs text-moon-muted">
            LINE Pay 付款已確認。我們將盡快處理您的訂單，並在可取貨時通知您。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/account"
            className="flex items-center justify-center border border-moon-border text-moon-text py-3 text-xs tracking-widest hover:border-moon-accent hover:text-moon-accent transition-colors"
          >
            前往會員中心
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center text-center text-xs text-moon-muted underline underline-offset-4 py-3 transition-colors hover:text-moon-accent"
          >
            返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
