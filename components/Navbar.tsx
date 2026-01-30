'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const { getTotalItems, toggleCart } = useCartStore();

  // 避免伺服器與瀏覽器初始內容不一致（Hydration error）
  // 先假設數量為 0，等到 client 端完成 hydration 再讀取實際購物車數量
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
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

          {/* 中間導航 */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="https://moon-map-original.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm tracking-widest text-moon-muted hover:text-moon-accent transition-colors"
            >
              探索展覽
            </a>
          </div>

          {/* 購物車按鈕 */}
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
    </nav>
  );
}
