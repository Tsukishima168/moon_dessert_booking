'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getResolvedUser } from '@/lib/client-auth';
import { ArrowLeft, DollarSign, Package, RefreshCw, Truck } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { OrderSummaryCard } from '@/components/shared/order-summary-card';
import { ProfileCard } from '@/components/shared/profile-card';
import { Button } from '@/components/ui/button';

interface OrderItem {
  id: string;
  name: string;
  variant_name?: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  phone: string;
  email: string;
  final_price: number;
  original_price?: number;
  discount_amount?: number;
  pickup_time: string;
  delivery_method: 'pickup' | 'delivery';
  delivery_address?: string;
  delivery_fee?: number;
  delivery_notes?: string;
  status: string;
  created_at: string;
  items: OrderItem[];
  promo_code?: string;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const sessionUser = await getResolvedUser();
      if (!sessionUser) {
        setError('尚未確認登入狀態，請重新登入後再查看訂單。');
        return;
      }

      const response = await fetch(`/api/user/orders/${orderId}`);
      if (!response.ok) {
        if (response.status === 401) {
          setError('請先登入');
          router.push('/auth/login?redirect=/account');
          return;
        }
        if (response.status === 404) {
          setError('訂單不存在或無權限查看');
          return;
        }
        throw new Error('載入訂單失敗');
      }
      const data = await response.json();
      setOrder(data);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('載入訂單出錯');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState fullScreen text="載入訂單中..." className="bg-moon-dark" />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-moon-dark px-4 py-16">
        <div className="mx-auto max-w-xl">
          <EmptyState
            title="目前無法查看這筆訂單"
            description={error || '訂單未找到'}
            className="border-moon-border bg-moon-black"
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" onClick={fetchOrder}>
                  <RefreshCw className="mr-1.5 size-4" />
                  重新載入
                </Button>
                <Link
                  href="/auth/login?redirect=/account"
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                >
                  重新登入
                </Link>
                <Link
                  href="/account"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
                >
                  <ArrowLeft className="mr-1.5 size-4" />
                  返回會員中心
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const createdDate = new Date(order.created_at).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-moon-dark text-moon-text">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回按鈕 */}
        <Link
          href="/account"
          className="mb-6 inline-flex items-center gap-2 font-semibold text-moon-accent hover:text-moon-text"
        >
          <ArrowLeft size={20} />
          返回會員中心
        </Link>

        <OrderSummaryCard
          orderId={order.order_id}
          status={order.status}
          totalPrice={order.final_price}
          createdAtLabel={createdDate}
          pickupTimeLabel={order.pickup_time}
          deliveryMethodLabel={order.delivery_method === 'pickup' ? '門市自取' : '宅配'}
          title="訂單詳情"
          className="mb-6"
        />

        {/* 客戶信息 */}
        <ProfileCard
          name={order.customer_name}
          email={order.email}
          phone={order.phone}
          title="客戶資訊"
          subtitle="這是下單時填寫的聯絡資料。"
          className="mb-6"
          footer={order.delivery_method === 'delivery' && order.delivery_address ? (
            <div className="flex items-start gap-3">
              <Truck className="mt-1 h-5 w-5 text-moon-accent" />
              <div className="flex-1">
                <p className="mb-1 text-sm text-moon-muted">配送地址</p>
                <p className="font-semibold text-moon-text">{order.delivery_address}</p>
                {order.delivery_notes && (
                  <p className="mt-2 text-sm text-moon-muted">備註: {order.delivery_notes}</p>
                )}
                {order.delivery_fee ? (
                  <p className="mt-2 text-sm text-moon-accent">配送費: ${order.delivery_fee.toFixed(0)}</p>
                ) : null}
              </div>
            </div>
          ) : undefined}
        />

        {/* 商品列表 */}
        <div className="mb-6 rounded-lg border border-moon-border bg-moon-black p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-moon-accent">
            <Package className="h-5 w-5 text-moon-accent" />
            訂購商品
          </h2>

          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-moon-border/60 bg-moon-dark/60 p-4 transition hover:border-moon-accent/60"
              >
                <div className="flex-1">
                  <p className="font-semibold text-moon-text">{item.name}</p>
                  {item.variant_name && (
                    <p className="text-sm text-moon-muted">規格: {item.variant_name}</p>
                  )}
                  <p className="mt-1 text-sm text-moon-muted">
                    數量: <span className="font-semibold">{item.quantity}</span> × ${item.price.toFixed(0)} = ${(item.price * item.quantity).toFixed(0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 價格摘要 */}
        <div className="rounded-lg border border-moon-border bg-moon-black p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-moon-accent">
            <DollarSign className="h-5 w-5 text-moon-accent" />
            金額摘要
          </h2>

          <div className="space-y-2 text-lg">
            <div className="flex justify-between text-moon-muted">
              <span>商品小計</span>
              <span>${itemsSubtotal.toFixed(0)}</span>
            </div>

            {order.discount_amount && order.discount_amount > 0 && (
              <>
                {order.promo_code && (
                  <div className="rounded border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-sm text-blue-300">
                    優惠碼: <span className="font-semibold">{order.promo_code}</span>
                  </div>
                )}
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>優惠折扣</span>
                  <span>-${order.discount_amount.toFixed(0)}</span>
                </div>
              </>
            )}

            {order.delivery_method === 'delivery' && order.delivery_fee && order.delivery_fee > 0 && (
            <div className="flex justify-between text-moon-muted">
                <span>配送費</span>
                <span>+${order.delivery_fee.toFixed(0)}</span>
              </div>
            )}

            <div className="mt-4 flex justify-between border-t border-moon-border pt-2 text-2xl font-bold text-moon-accent">
              <span>總金額</span>
              <span>${order.final_price.toFixed(0)}</span>
            </div>
          </div>

          {order.status === 'pending' && (
            <div className="mt-6 rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-4">
              <p className="mb-2 font-semibold text-yellow-300">⚠️ 待付款</p>
              <p className="mb-4 text-sm text-yellow-200">
                請盡快完成付款，以確保您的訂單能夠按時製作。
              </p>
              <div className="space-y-2 text-sm text-yellow-200">
                <p className="font-semibold">匯款方式:</p>
                <p>銀行: 連線商業銀行</p>
                <p>帳號: 111007479473</p>
                <p>戶名: 陳鵬文</p>
                <p className="mt-2 text-xs">請在備註欄中輸入訂單編號: <span className="font-mono">{order.order_id}</span></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
