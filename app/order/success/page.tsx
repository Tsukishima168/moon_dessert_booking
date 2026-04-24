import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

import { ClearPendingOrder } from '@/components/checkout/clear-pending-order';
import { createAdminClient } from '@/lib/supabase-admin';
import { SHOP_CHECKOUT_SITE } from '@/src/lib/order-scope';

export const dynamic = 'force-dynamic';

const PAID_STATUSES = new Set(['paid', 'ready', 'completed']);

interface OrderSuccessPageProps {
  searchParams?: {
    orderId?: string;
  };
}

export default async function OrderSuccessPage({
  searchParams,
}: OrderSuccessPageProps) {
  const orderId = searchParams?.orderId;

  if (!orderId) {
    redirect('/order/error?reason=missing_params');
  }

  const adminClient = createAdminClient();
  const { data: order, error } = await adminClient
    .from('orders')
    .select('order_id, status, payment_method, payment_date')
    .eq('order_id', orderId)
    .eq('checkout_site', SHOP_CHECKOUT_SITE)
    .maybeSingle();

  if (error || !order) {
    redirect('/order/error?reason=order_not_found');
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
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <CheckCircle className="w-12 h-12 text-moon-accent mx-auto" />
          <h2 className="text-xl text-moon-accent tracking-widest">付款成功</h2>
          <p className="text-xs text-moon-muted tracking-wider">PAYMENT CONFIRMED</p>
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
