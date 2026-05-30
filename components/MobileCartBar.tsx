'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

/**
 * MobileCartBar — 行動版底部 sticky 結帳列
 * 購物車有商品、且非結帳/後台頁時出現，常駐引導下單。
 * z-30：低於 CartSidebar 遮罩(z-40)/抽屜(z-50)，購物車開啟時被蓋住。
 */
export default function MobileCartBar() {
  const pathname = usePathname();
  const { getTotalItems, getFinalPrice, openCart } = useCartStore();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const totalItems = hasHydrated ? getTotalItems() : 0;
  const finalPrice = hasHydrated ? getFinalPrice() : 0;

  const hidden =
    !hasHydrated ||
    totalItems === 0 ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/checkout');

  if (hidden) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t border-moon-border bg-moon-black/95 backdrop-blur-sm animate-fadeIn"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch gap-3 p-3">
        <button
          type="button"
          onClick={openCart}
          className="flex items-center gap-2 px-1 text-left"
          aria-label="查看購物車"
        >
          <div className="relative shrink-0">
            <ShoppingBag size={22} className="text-moon-accent" />
            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-moon-accent text-[10px] font-bold text-moon-black">
              {totalItems}
            </span>
          </div>
          <div className="leading-tight">
            <p className="text-[10px] tracking-widest text-moon-muted">小計</p>
            <p className="text-sm font-light text-moon-accent">${finalPrice}</p>
          </div>
        </button>
        <Link
          href="/checkout"
          className="flex-1 flex items-center justify-center bg-moon-accent text-moon-black text-sm tracking-widest font-medium hover:bg-moon-text transition-colors"
        >
          前往結帳
        </Link>
      </div>
    </div>
  );
}
