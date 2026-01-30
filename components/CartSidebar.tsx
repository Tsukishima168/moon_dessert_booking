'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import Image from 'next/image';
import Link from 'next/link';

export default function CartSidebar() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    getTotalPrice,
    getFinalPrice,
    getTotalItems,
    promoCode,
    discountAmount,
  } = useCartStore();

  // 與 Navbar 一樣，用 hasHydrated 避免 SSR 與 CSR 初始內容不一致
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const totalPrice = hasHydrated ? getTotalPrice() : 0;
  const finalPrice = hasHydrated ? getFinalPrice() : 0;
  const totalItems = hasHydrated ? getTotalItems() : 0;

  return (
    <>
      {/* 背景遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 transition-opacity backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      {/* 側邊欄 */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full sm:max-w-md bg-moon-black border-l border-moon-border shadow-2xl z-50
          transform transition-transform duration-500 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* 標題列 */}
        <div className="border-b border-moon-border p-4 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-light text-moon-accent tracking-wider mb-1">
                YOUR CART
              </h2>
              <p className="text-xs sm:text-sm text-moon-muted tracking-wide">
                {totalItems} {totalItems === 1 ? 'ITEM' : 'ITEMS'}
              </p>
            </div>
            <button
              onClick={closeCart}
              className="p-2 hover:bg-moon-border transition-colors"
            >
              <X size={20} className="text-moon-text sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* 購物車內容 */}
        <div className="flex flex-col h-[calc(100%-180px)]">
          {items.length === 0 ? (
            // 空購物車
            <div className="flex-1 flex flex-col items-center justify-center text-moon-muted p-8">
              <ShoppingBag size={64} strokeWidth={1} className="mb-4 opacity-30" />
              <p className="text-sm tracking-wider mb-2">YOUR CART IS EMPTY</p>
              <p className="text-xs text-moon-muted/60 mb-8">Add some desserts to get started</p>
              <button
                onClick={closeCart}
                className="border border-moon-border text-moon-text px-8 py-3 text-sm tracking-widest hover:bg-moon-border transition-colors"
              >
                CONTINUE SHOPPING
              </button>
            </div>
          ) : (
            <>
              {/* 商品列表 */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-moon-border p-4 hover:border-moon-muted transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* 商品圖片 */}
                      <div className="relative w-20 h-20 flex-shrink-0 bg-moon-gray">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-2xl opacity-20">
                            🍰
                          </div>
                        )}
                      </div>

                      {/* 商品資訊 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-light text-moon-accent truncate mb-1 tracking-wide">
                          {item.name}
                        </h3>
                        {item.variant_name && (
                          <p className="text-xs text-moon-muted mb-2 tracking-wider">
                            {item.variant_name}
                          </p>
                        )}
                        <p className="text-sm text-moon-text font-light">
                          ${item.price}
                        </p>
                      </div>

                      {/* 刪除按鈕 */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-moon-muted hover:text-moon-accent transition-colors self-start p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* 數量控制 */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-moon-border">
                      <div className="flex items-center border border-moon-border">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-moon-border transition-colors"
                        >
                          <Minus size={14} className="text-moon-text" />
                        </button>
                        <span className="px-6 text-sm text-moon-text">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-moon-border transition-colors"
                        >
                          <Plus size={14} className="text-moon-text" />
                        </button>
                      </div>

                      <div className="text-sm font-light text-moon-accent">
                        <span className="text-xs">$</span>{item.price * item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 底部結帳區 */}
              <div className="border-t border-moon-border p-4 sm:p-8 bg-moon-dark">
                {/* 價格明細 */}
                <div className="space-y-2 mb-4 sm:mb-6">
                  {/* 小計 */}
                  <div className="flex justify-between items-baseline text-moon-muted">
                    <span className="text-xs tracking-widest">SUBTOTAL</span>
                    <span className="text-sm">${totalPrice}</span>
                  </div>

                  {/* 優惠折扣 */}
                  {promoCode && discountAmount > 0 && (
                    <div className="flex justify-between items-baseline text-moon-accent">
                      <span className="text-xs tracking-widest">
                        DISCOUNT ({promoCode})
                      </span>
                      <span className="text-sm">-${discountAmount}</span>
                    </div>
                  )}

                  {/* 總計 */}
                  <div className="flex justify-between items-baseline pt-3 border-t border-moon-border">
                    <span className="text-xs sm:text-sm tracking-widest text-moon-muted">TOTAL</span>
                    <span className="text-2xl sm:text-3xl font-light text-moon-accent tracking-wide">
                      <span className="text-lg sm:text-xl mr-1">$</span>{finalPrice}
                    </span>
                  </div>
                </div>

                {/* 結帳按鈕 */}
                <Link href="/checkout" onClick={closeCart}>
                  <button className="w-full bg-moon-accent text-moon-black py-3 sm:py-4 text-xs sm:text-sm tracking-widest hover:bg-moon-text transition-colors">
                    <span className="hidden sm:inline">PROCEED TO CHECKOUT</span>
                    <span className="sm:hidden">前往結帳</span>
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
