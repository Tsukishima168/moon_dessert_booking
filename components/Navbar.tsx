'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, User, LogOut } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function Navbar() {
  const { getTotalItems, toggleCart } = useCartStore();
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);

  // 避免伺服器與瀏覽器初始內容不一致（Hydration error）
  // 先假設數量為 0，等到 client 端完成 hydration 再讀取實際購物車數量
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);

    // 取得當前登入狀態
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user ?? null));

    // 監聽登入/登出事件
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const totalItems = hasHydrated ? getTotalItems() : 0;

  return (
    <nav className="bg-moon-black border-b border-moon-border sticky top-0 z-30 backdrop-blur-sm bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1769501262/%E6%A8%99%E6%BA%96%E5%AD%97-04_swnuoh.png"
              alt="MOON MOON"
              width={120}
              height={40}
              className="h-8 sm:h-10 w-auto group-hover:opacity-80 transition-opacity"
              priority
            />
          </Link>

          {/* 中間導航 - 月島網絡 */}
          <div className="hidden md:flex items-center gap-6">
            <a
              href="https://map.kiwimu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm tracking-widest text-moon-muted hover:text-moon-accent transition-colors flex items-center gap-1"
            >
              品牌地圖
            </a>
            <a
              href="https://kiwimu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm tracking-widest text-moon-muted hover:text-moon-accent transition-colors flex items-center gap-1"
            >
              MBTI測驗
            </a>
            {/* Passport Link - 暫時導向登入頁，未來指向獨立 Passport App */}
            <Link
              href="/auth/login"
              className="text-sm tracking-widest text-moon-muted hover:text-moon-accent transition-colors flex items-center gap-1"
            >
              甜點護照
            </Link>
          </div>

          {/* 右側按鈕區 */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              // 已登入：顯示 email 縮寫 + 登出按鈕
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3">
                  <User size={14} className="text-moon-accent" />
                  <span className="text-xs text-moon-muted hidden sm:block truncate max-w-[120px]">
                    {currentUser.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="bg-moon-black border border-moon-border p-3 sm:py-3 sm:px-4 hover:bg-moon-border transition-all group flex items-center gap-2"
                  title="登出"
                >
                  <span className="text-xs text-moon-text hidden sm:block group-hover:text-moon-accent transition-colors tracking-widest font-bold">登出</span>
                  <LogOut size={16} className="text-moon-text group-hover:text-moon-accent transition-colors" />
                </button>
              </div>
            ) : (
              // 未登入：User icon 指向登入頁
              <Link
                href="/auth/login"
                className="bg-moon-black border border-moon-border p-3 sm:p-4 hover:bg-moon-border transition-all group"
              >
                <User size={18} className="text-moon-text sm:w-5 sm:h-5 group-hover:text-moon-accent transition-colors" />
              </Link>
            )}

            <button
              onClick={toggleCart}
              className="relative group"
            >
              <div className="bg-moon-gray border border-moon-border p-3 sm:p-4 rounded-none hover:bg-moon-border transition-all">
                <ShoppingCart size={18} className="text-moon-text sm:w-5 sm:h-5" />
              </div>

              {/* 商品數量徽章 */}
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-moon-accent text-moon-black text-[10px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
