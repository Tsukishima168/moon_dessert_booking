'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ShoppingCart, User } from 'lucide-react';

import KiwimuUniverseRail from '@/components/KiwimuUniverseRail';
import ThemeToggle from '@/components/ThemeToggle';
import { clearServerSession, getResolvedUser } from '@/lib/client-auth';
import { supabase } from '@/lib/supabase';
import { openPassportLogin, PASSPORT_AUTH_COMPLETE_EVENT } from '@/src/lib/auth-storage';
import { useCartStore } from '@/store/cartStore';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { getTotalItems, isOpen: isCartOpen, toggleCart } = useCartStore();
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authLoginBusy, setAuthLoginBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const isAdminRoute = pathname?.startsWith('/admin');

  const restoreAuth = useCallback(async () => {
    const user = await getResolvedUser();
    setCurrentUser(user);
    setAuthReady(true);
    return user;
  }, []);

  useEffect(() => {
    setHasHydrated(true);

    void restoreAuth();

    const handlePassportComplete = () => {
      setAuthError(null);
      void restoreAuth().then(() => router.refresh());
    };

    window.addEventListener(PASSPORT_AUTH_COMPLETE_EVENT, handlePassportComplete);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      window.removeEventListener(PASSPORT_AUTH_COMPLETE_EVENT, handlePassportComplete);
      subscription.unsubscribe();
    };
  }, [restoreAuth, router]);

  const totalItems = hasHydrated ? getTotalItems() : 0;

  // 加入購物車時徽章彈跳（僅在數量增加時，跳過初次 hydration）
  const [cartBump, setCartBump] = useState(false);
  const prevItemsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hasHydrated) return;
    if (prevItemsRef.current !== null && totalItems > prevItemsRef.current) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 420);
      prevItemsRef.current = totalItems;
      return () => clearTimeout(t);
    }
    prevItemsRef.current = totalItems;
  }, [totalItems, hasHydrated]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setAuthError(null);
      if (!await clearServerSession()) throw new Error('server_logout_failed');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUser(null);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('登出失敗:', error);
      setAuthError('登出尚未完成，請再試一次。');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogin = () => {
    if (currentUser) {
      router.push('/account');
      return;
    }

    if (authLoginBusy) return;

    setAuthLoginBusy(true);
    setAuthError(null);
    openPassportLogin({
      returnTo: window.location.href,
      intent: 'shop_navbar_login',
      onComplete: async () => {
        const user = await restoreAuth();
        setAuthLoginBusy(false);
        if (user) {
          router.refresh();
          return;
        }

        setAuthError('登入已完成，但會員狀態尚未同步，請再試一次。');
      },
      onError: (detail) => {
        setAuthLoginBusy(false);
        setAuthError(detail.message || '登入失敗，請再試一次。');
      },
    });
  };

  return (
    <>
      {!isAdminRoute ? <KiwimuUniverseRail currentSite="shop" /> : null}
      <nav
        className={`sticky top-0 z-30 border-b border-moon-border bg-moon-black/90 backdrop-blur-sm ${isAdminRoute ? 'admin-shell' : 'shop-navbar'}`}
      >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`flex h-16 items-center justify-between sm:h-20 ${isAdminRoute ? '' : 'shop-navbar-main'}`}>
          <Link href="/" className="flex min-h-11 min-w-0 items-center group">
            <Image
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1769501262/%E6%A8%99%E6%BA%96%E5%AD%97-04_swnuoh.png"
              alt="MOON MOON"
              width={120}
              height={40}
              className="theme-logo h-auto w-24 transition-opacity group-hover:opacity-80 sm:w-[140px]"
              priority
            />
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <Link href="/#menu-section" className="flex min-h-11 items-center text-sm text-moon-text hover:text-moon-accent">選購甜點</Link>
            <Link href="/shipping" className="flex min-h-11 items-center text-sm text-moon-muted hover:text-moon-accent">取貨說明</Link>
            <button type="button" onClick={handleLogin} disabled={authLoginBusy} className="flex min-h-11 items-center text-sm text-moon-muted hover:text-moon-accent">{authLoginBusy ? '登入中…' : '我的訂單'}</button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {!isAdminRoute ? <ThemeToggle /> : null}

            {authReady ? (
              currentUser ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Link
                    href="/account"
                    className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 border border-moon-border px-3 py-3 transition-all hover:bg-moon-border sm:px-4"
                    aria-label="前往會員中心"
                    title="前往會員中心"
                  >
                    <User size={14} className="text-moon-accent" />
                    <span className="hidden text-xs font-bold tracking-widest text-moon-text transition-colors hover:text-moon-accent sm:block">
                      會員中心
                    </span>
                    <span className="hidden max-w-[120px] truncate text-xs text-moon-muted lg:block">
                      {currentUser.email?.split('@')[0]}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex min-h-11 min-w-11 items-center justify-center gap-2 border border-moon-border bg-moon-black p-3 transition-all hover:bg-moon-border disabled:opacity-50 sm:px-4 sm:py-3"
                    aria-label={loggingOut ? '登出中' : '登出'}
                    title="登出"
                  >
                    <span className="hidden text-xs font-bold tracking-widest text-moon-text sm:block">
                      {loggingOut ? '登出中...' : '登出'}
                    </span>
                    <LogOut size={16} className="text-moon-text transition-colors" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={authLoginBusy}
                  className="border border-moon-border bg-moon-black p-3 transition-all hover:bg-moon-border sm:p-4"
                  aria-label={authLoginBusy ? '登入中' : '登入或註冊'}
                  title={authLoginBusy ? '登入中...' : '登入 / 註冊'}
                >
                  <User size={18} className="text-moon-text transition-colors sm:h-5 sm:w-5" />
                </button>
              )
            ) : (
              <div className="border border-moon-border bg-moon-black p-3 opacity-60 sm:p-4">
                <User size={18} className="text-moon-text sm:h-5 sm:w-5" />
              </div>
            )}

            {!isAdminRoute ? (
              <button
                type="button"
                onClick={toggleCart}
                className="relative group"
                aria-label={`開啟購物車，共 ${totalItems} 件商品`}
                aria-expanded={isCartOpen}
                aria-controls="shop-cart-sidebar"
                aria-haspopup="dialog"
              >
                <div className="rounded-none border border-moon-border bg-moon-gray p-3 transition-all hover:bg-moon-border sm:p-4">
                  <ShoppingCart size={18} className="text-moon-text sm:h-5 sm:w-5" />
                </div>

                {totalItems > 0 && (
                  <span className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-moon-accent text-xs font-bold text-moon-black sm:-right-2 sm:-top-2 sm:h-6 sm:w-6 sm:text-xs ${cartBump ? 'animate-cart-bump' : ''}`}>
                    {totalItems}
                  </span>
                )}
              </button>
            ) : null}
          </div>
        </div>
        {authError ? (
          <div role="alert" className="pb-3 text-center text-xs text-red-300">
            {authError}
            {authError.startsWith('登出') && (
              <button type="button" onClick={handleLogout} disabled={loggingOut} className="ml-2 min-h-11 px-3 underline underline-offset-4">
                {loggingOut ? '登出中...' : '再試一次登出'}
              </button>
            )}
          </div>
        ) : null}
      </div>
      </nav>
    </>
  );
}
