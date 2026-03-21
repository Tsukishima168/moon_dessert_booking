'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw, ShoppingBag, Sparkles, UserRound } from 'lucide-react';

import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { OrderSummaryCard } from '@/components/shared/order-summary-card';
import { ProfileCard } from '@/components/shared/profile-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clearServerSession, getResolvedUser } from '@/lib/client-auth';
import { supabase } from '@/lib/supabase';

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
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  created_at?: string | null;
}

interface PointsResponse {
  points?: number;
}

interface ProfileFormState {
  full_name: string;
  phone: string;
}

const emptyProfileForm: ProfileFormState = {
  full_name: '',
  phone: '',
};

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [orders, setOrders] = useState<Order[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authMissing, setAuthMissing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const recentOrders = useMemo(() => orders.slice(0, 3), [orders]);
  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.final_price || 0), 0),
    [orders]
  );

  useEffect(() => {
    void loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      setAuthMissing(false);

      const sessionUser = await getResolvedUser();
      if (!sessionUser) {
        setAuthMissing(true);
        setError('尚未確認登入狀態。請先登入，或稍後重新檢查。');
        return;
      }

      const [profileRes, ordersRes, pointsRes] = await Promise.all([
        fetch('/api/user/profile', { cache: 'no-store' }),
        fetch('/api/user/orders', { cache: 'no-store' }),
        fetch('/api/user/points', { cache: 'no-store' }),
      ]);

      if (
        profileRes.status === 401 ||
        ordersRes.status === 401 ||
        pointsRes.status === 401
      ) {
        setAuthMissing(true);
        setError('登入資訊尚未同步完成，請重新登入一次。');
        return;
      }

      if (!profileRes.ok || !ordersRes.ok || !pointsRes.ok) {
        throw new Error('會員資料讀取失敗');
      }

      const [profileData, ordersData, pointsData] = await Promise.all([
        profileRes.json() as Promise<Profile>,
        ordersRes.json() as Promise<Order[]>,
        pointsRes.json() as Promise<PointsResponse>,
      ]);

      setProfile(profileData);
      setProfileForm({
        full_name: profileData?.full_name || '',
        phone: profileData?.phone || '',
      });
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setPoints(typeof pointsData.points === 'number' ? pointsData.points : 0);
    } catch (loadError) {
      console.error('載入會員資料錯誤:', loadError);
      setError('載入會員中心失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      await clearServerSession();
      router.push('/');
      router.refresh();
    } catch (logoutError) {
      console.error('登出錯誤:', logoutError);
      setError('登出失敗，請稍後再試。');
    } finally {
      setSigningOut(false);
    }
  };

  const handleProfileSave = async () => {
    try {
      setSavingProfile(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '更新失敗');
      }

      setProfile(result);
      setProfileForm({
        full_name: result?.full_name || '',
        phone: result?.phone || '',
      });
      setSuccessMessage('會員資料已更新。');
    } catch (saveError) {
      console.error('更新會員資料錯誤:', saveError);
      setError(saveError instanceof Error ? saveError.message : '更新會員資料失敗');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        fullScreen
        text="確認會員登入狀態中..."
        className="bg-moon-dark"
      />
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-moon-dark px-4 py-16">
        <div className="mx-auto max-w-xl">
          <EmptyState
            title={authMissing ? '目前還沒有登入完成' : '會員中心暫時無法載入'}
            description={error}
            className="border-moon-border bg-moon-black"
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" onClick={loadAccount}>
                  <RefreshCw className="mr-1.5 size-4" />
                  重新檢查
                </Button>
                <Link
                  href="/auth/login?redirect=/account"
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                >
                  前往登入
                </Link>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-moon-dark text-moon-text">
      <header className="sticky top-0 z-10 border-b border-moon-border bg-moon-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-moon-muted">Moon Passport</p>
            <h1 className="mt-2 text-2xl font-light tracking-wider text-moon-accent">
              會員中心
            </h1>
          </div>
          <Button variant="outline" onClick={handleLogout} disabled={signingOut}>
            <LogOut className="mr-1.5 size-4" />
            {signingOut ? '登出中...' : '登出'}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <ProfileCard
          name={profile.full_name || 'MoonMoon 會員'}
          email={profile.email}
          phone={profile.phone}
          joinedAt={
            profile.created_at
              ? new Date(profile.created_at).toLocaleDateString('zh-TW')
              : null
          }
          title="會員總覽"
          subtitle="你可以在這裡查看點數、訂單紀錄，並更新聯絡資料。"
          className="mb-8"
          footer={(
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                label="會員點數"
                value={`${points} 點`}
                hint="下次活動可直接使用"
              />
              <SummaryCard
                label="累積訂單"
                value={`${orders.length} 筆`}
                hint="包含目前這個帳號的所有訂單"
              />
              <SummaryCard
                label="累積消費"
                value={`NT$ ${totalSpent.toFixed(0)}`}
                hint="可快速回看近期消費狀態"
              />
            </div>
          )}
        />

        {error ? (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {successMessage}
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
          <TabsList className="w-full justify-start gap-2 bg-moon-black/80 p-1 md:w-auto">
            <TabsTrigger value="overview">總覽</TabsTrigger>
            <TabsTrigger value="orders">訂單</TabsTrigger>
            <TabsTrigger value="profile">個人資料</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="rounded-xl border border-moon-border bg-moon-black p-6">
                <div className="mb-4 flex items-center gap-2 text-moon-accent">
                  <Sparkles className="size-5" />
                  <h2 className="text-lg font-light tracking-wider">快速開始</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <QuickLinkCard
                    href="/checkout"
                    title="直接前往結帳"
                    description="登入後資料會自動帶入，適合快速複購。"
                  />
                  <QuickLinkCard
                    href="/"
                    title="繼續挑選甜點"
                    description="回首頁查看最新商品、推薦甜點與橫幅活動。"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-moon-border bg-moon-black p-6">
                <div className="mb-4 flex items-center gap-2 text-moon-accent">
                  <UserRound className="size-5" />
                  <h2 className="text-lg font-light tracking-wider">會員提醒</h2>
                </div>
                <ul className="space-y-3 text-sm text-moon-muted">
                  <li>登入後的訂單會綁定到這個帳號，可在這裡回看每一筆訂單。</li>
                  <li>若你想收到正確的聯絡通知，請先確認姓名與電話是否正確。</li>
                  <li>優惠碼會在結帳頁驗證，成功套用後才會出現在訂單金額摘要中。</li>
                </ul>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-xl font-light tracking-wider text-moon-accent">
                  <ShoppingBag size={20} />
                  最近訂單
                </h2>
                {orders.length > 0 ? (
                  <button
                    type="button"
                    className="text-sm text-moon-muted hover:text-moon-accent"
                    onClick={() => setActiveTab('orders')}
                  >
                    查看全部 →
                  </button>
                ) : null}
              </div>

              {recentOrders.length === 0 ? (
                <EmptyState
                  title="目前還沒有訂單"
                  description="完成第一筆訂單後，這裡會自動顯示最近紀錄。"
                  className="border-moon-border bg-moon-black"
                  action={(
                    <Link
                      href="/"
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                    >
                      開始訂購
                    </Link>
                  )}
                />
              ) : (
                <div className="space-y-4">
                  {recentOrders.map(order => (
                    <OrderLinkCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {orders.length === 0 ? (
              <EmptyState
                title="還沒有任何訂單"
                description="先去選幾款甜點，下單成功後這裡就會有完整紀錄。"
                className="border-moon-border bg-moon-black"
                action={(
                  <Link
                    href="/"
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                  >
                    開始訂購
                  </Link>
                )}
              />
            ) : (
              orders.map(order => <OrderLinkCard key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="rounded-xl border border-moon-border bg-moon-black p-6">
              <div className="mb-6">
                <h2 className="text-xl font-light tracking-wider text-moon-accent">
                  個人資料
                </h2>
                <p className="mt-2 text-sm text-moon-muted">
                  這些資料會在下次結帳時自動帶入，讓你不用反覆輸入。
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-moon-muted">姓名</label>
                  <Input
                    value={profileForm.full_name}
                    onChange={event =>
                      setProfileForm(current => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                    placeholder="輸入你的姓名"
                    className="border-moon-border bg-moon-dark text-moon-text"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-moon-muted">電話</label>
                  <Input
                    value={profileForm.phone}
                    onChange={event =>
                      setProfileForm(current => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="輸入聯絡電話"
                    className="border-moon-border bg-moon-dark text-moon-text"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-moon-muted">Email</label>
                  <Input
                    value={profile.email || ''}
                    readOnly
                    className="border-moon-border bg-moon-dark/80 text-moon-muted"
                  />
                  <p className="text-xs text-moon-muted">
                    Email 由登入帳號提供，這一輪不開放在前台直接修改。
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button onClick={handleProfileSave} disabled={savingProfile}>
                  {savingProfile ? '儲存中...' : '儲存資料'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setProfileForm({
                      full_name: profile.full_name || '',
                      phone: profile.phone || '',
                    })
                  }
                >
                  還原
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-moon-border bg-moon-dark/70 p-4">
      <p className="text-sm text-moon-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-moon-accent">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-moon-muted">{hint}</p>
    </div>
  );
}

function QuickLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-moon-border bg-moon-dark/70 p-4 transition-colors hover:border-moon-accent"
    >
      <p className="text-base font-semibold text-moon-accent">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-moon-muted">{description}</p>
    </Link>
  );
}

function OrderLinkCard({ order }: { order: Order }) {
  return (
    <Link key={order.id} href={`/account/order/${order.id}`} className="block transition">
      <OrderSummaryCard
        orderId={order.order_id}
        status={order.status}
        totalPrice={order.final_price}
        customerLabel={`${order.customer_name} • ${order.phone}`}
        createdAtLabel={new Date(order.created_at).toLocaleDateString('zh-TW')}
        pickupTimeLabel={`${new Date(order.pickup_time).toLocaleDateString('zh-TW')} ${new Date(order.pickup_time).toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
        })}`}
        deliveryMethodLabel={order.delivery_method === 'pickup' ? '門市自取' : '宅配'}
        title="訂單摘要"
        className="hover:border-moon-accent"
      />
    </Link>
  );
}
