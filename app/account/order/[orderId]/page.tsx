'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, DollarSign, Package, Truck, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

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

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: '待付款', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  paid: { label: '已付款', color: 'bg-blue-100 text-blue-800', icon: '✅' },
  preparing: { label: '製作中', color: 'bg-orange-100 text-orange-800', icon: '👨‍🍳' },
  ready: { label: '可取貨', color: 'bg-green-100 text-green-800', icon: '🎉' },
  completed: { label: '已完成', color: 'bg-purple-100 text-purple-800', icon: '✨' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800', icon: '❌' },
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/user/orders/${orderId}`);
      if (!response.ok) {
        if (response.status === 401) {
          setError('請先登入');
          router.push('/auth/login');
          return;
        }
        if (response.status === 404) {
          setError('訂單不存在或無權限查看');
          return;
        }
        throw new Error('加載訂單失敗');
      }
      const data = await response.json();
      setOrder(data);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('加載訂單出錯');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!order || !window.confirm('確定要取消這筆訂單嗎？')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/user/orders/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json() as { success?: boolean; error?: string; message?: string };
      if (!res.ok) {
        alert(data.error || '取消失敗，請稍後再試');
        return;
      }
      setOrder(prev => prev ? { ...prev, status: 'cancelled' } : prev);
    } catch {
      alert('取消訂單發生錯誤');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加載訂單中...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">⚠️ {error || '訂單未找到'}</h1>
          <Link
            href="/account"
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
          >
            <ArrowLeft size={20} />
            返回會員中心
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS['pending'];
  const createdDate = new Date(order.created_at).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const itemsSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回按鈕 */}
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 mb-6 font-semibold"
        >
          <ArrowLeft size={20} />
          返回會員中心
        </Link>

        {/* 訂單頭部 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">訂單詳情</h1>
              <p className="text-gray-600">訂單編號: <span className="font-mono font-bold text-pink-600">{order.order_id}</span></p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`px-4 py-2 rounded-lg font-semibold ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.label}
              </div>
              {/* 取消訂單按鈕（僅 pending 狀態可用） */}
              {order.status === 'pending' && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-xs px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition"
                >
                  {cancelling ? '取消中...' : '取消訂單'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">下單時間</p>
              <p className="font-semibold text-gray-800">{createdDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">取貨時間</p>
              <p className="font-semibold text-gray-800">{order.pickup_time}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">配送方式</p>
              <p className="font-semibold text-gray-800">
                {order.delivery_method === 'pickup' ? '門市自取' : '宅配'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">總金額</p>
              <p className="font-bold text-pink-600 text-lg">${order.final_price.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* 客戶信息 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">客戶信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-pink-600" />
              <div>
                <p className="text-sm text-gray-600">郵箱</p>
                <p className="font-semibold text-gray-800">{order.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-pink-600" />
              <div>
                <p className="text-sm text-gray-600">電話</p>
                <p className="font-semibold text-gray-800">{order.phone}</p>
              </div>
            </div>
          </div>

          {order.delivery_method === 'delivery' && order.delivery_address && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-pink-600 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">配送地址</p>
                  <p className="font-semibold text-gray-800">{order.delivery_address}</p>
                  {order.delivery_notes && (
                    <p className="text-sm text-gray-600 mt-2">備註: {order.delivery_notes}</p>
                  )}
                  {order.delivery_fee && (
                    <p className="text-sm text-pink-600 mt-2">配送費: ${order.delivery_fee.toFixed(0)}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 商品列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-pink-600" />
            訂購商品
          </h2>

          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  {item.variant_name && (
                    <p className="text-sm text-gray-600">規格: {item.variant_name}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    數量: <span className="font-semibold">{item.quantity}</span> × ${item.price.toFixed(0)} = ${(item.price * item.quantity).toFixed(0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 價格摘要 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-pink-600" />
            金額摘要
          </h2>

          <div className="space-y-2 text-lg">
            <div className="flex justify-between text-gray-700">
              <span>商品小計</span>
              <span>${itemsSubtotal.toFixed(0)}</span>
            </div>

            {order.discount_amount && order.discount_amount > 0 && (
              <>
                {order.promo_code && (
                  <div className="text-sm text-gray-600 px-3 py-2 bg-blue-50 rounded">
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
              <div className="flex justify-between text-gray-700">
                <span>配送費</span>
                <span>+${order.delivery_fee.toFixed(0)}</span>
              </div>
            )}

            <div className="border-t border-gray-300 pt-2 mt-4 flex justify-between text-2xl font-bold text-pink-600">
              <span>總金額</span>
              <span>${order.final_price.toFixed(0)}</span>
            </div>
          </div>

          {order.status === 'pending' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 font-semibold mb-2">⚠️ 待付款</p>
              <p className="text-sm text-yellow-700 mb-4">
                請盡快完成付款，以確保您的訂單能夠按時製作。
              </p>
              <div className="space-y-2 text-sm text-yellow-700">
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
