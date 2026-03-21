'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, LogOut, ShoppingBag, Calendar, DollarSign, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  phone: string;
  final_price: number;
  pickup_time: string;
  delivery_method: 'pickup' | 'delivery';
  status: string;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '⏳ 待付款', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: '✅ 已付款', color: 'bg-blue-100 text-blue-800' },
  preparing: { label: '👨‍🍳 製作中', color: 'bg-orange-100 text-orange-800' },
  ready: { label: '🎉 可取貨', color: 'bg-green-100 text-green-800' },
  completed: { label: '✨ 已完成', color: 'bg-purple-100 text-purple-800' },
  cancelled: { label: '❌ 已取消', color: 'bg-red-100 text-red-800' },
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);

      // 取得當前用戶
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();

      if (!sessionUser) {
        router.push(`/auth/login?redirect=/account`);
        return;
      }

      setUser(sessionUser);

      // 取得用戶資料
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // 取得用戶訂單
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', sessionUser.id)
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData);
      }
    } catch (error) {
      console.error('載入用戶資料錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('登出錯誤:', error);
      alert('登出失敗');
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-moon-dark">
        <div className="text-center">
          <Loader2 className="animate-spin text-moon-accent mx-auto mb-3" size={40} />
          <p className="text-moon-muted">載入中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-moon-dark text-moon-text">
      {/* Header */}
      <header className="bg-moon-black border-b border-moon-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-light tracking-wider text-moon-accent">
            🌙 MoonMoon Dessert
          </Link>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded text-white font-semibold"
          >
            <LogOut size={16} />
            {signingOut ? '登出中...' : '登出'}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 用戶資料卡片 */}
        <div className="bg-moon-black border border-moon-border rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-moon-accent flex items-center justify-center">
              <User size={24} className="text-moon-black" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-moon-accent mb-2">
                {profile?.full_name || '用戶'}
              </h1>
              <p className="text-moon-muted mb-1">📧 {user.email}</p>
              {profile?.phone && <p className="text-moon-muted">📱 {profile.phone}</p>}
              <p className="text-xs text-moon-muted mt-4">
                會員加入於 {new Date(profile?.created_at || '').toLocaleDateString('zh-TW')}
              </p>
            </div>
          </div>
        </div>

        {/* 訂單列表 */}
        <div>
          <h2 className="text-xl font-light tracking-wider text-moon-accent mb-4 flex items-center gap-2">
            <ShoppingBag size={20} />
            我的訂單
          </h2>

          {orders.length === 0 ? (
            <div className="bg-moon-black border border-moon-border rounded-lg p-8 text-center">
              <p className="text-moon-muted mb-4">目前沒有訂單</p>
              <Link
                href="/"
                className="inline-block px-6 py-2 bg-moon-accent text-moon-black font-semibold hover:opacity-90 rounded"
              >
                開始訂購
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const statusInfo = STATUS_LABELS[order.status] || {
                  label: order.status,
                  color: 'bg-gray-100 text-gray-800',
                };

                return (
                  <Link
                    key={order.id}
                    href={`/account/order/${order.id}`}
                    className="block bg-moon-black border border-moon-border hover:border-moon-accent rounded-lg p-6 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-moon-accent">
                            訂單 #{order.order_id}
                          </h3>
                          <span
                            className={`text-xs px-3 py-1 rounded font-semibold ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-sm text-moon-muted mb-3">
                          {order.customer_name} • {order.phone}
                        </p>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-moon-muted">取貨方式</span>
                            <p>
                              {order.delivery_method === 'pickup'
                                ? '🏪 門市自取'
                                : '🚚 宅配'}
                            </p>
                          </div>
                          <div>
                            <span className="text-moon-muted">
                              <Calendar size={14} className="inline mr-1" />
                              取貨時間
                            </span>
                            <p>
                              {new Date(order.pickup_time).toLocaleDateString('zh-TW')}{' '}
                              {new Date(order.pickup_time).toLocaleTimeString('zh-TW', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-moon-muted">
                              <DollarSign size={14} className="inline mr-1" />
                              訂單金額
                            </span>
                            <p className="font-semibold text-moon-accent">
                              NT${order.final_price}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-xs text-moon-muted">
                        {new Date(order.created_at).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
