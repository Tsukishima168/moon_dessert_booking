'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { trackShopEvent } from '@/lib/shop-analytics';
import { useCartStore } from '@/store/cartStore';
import Image from 'next/image';
import Link from 'next/link';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

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
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    const drawer = drawerRef.current;

    if (!drawer) return;

    if (!isOpen) {
      drawer.setAttribute('inert', '');
      return;
    }

    drawer.removeAttribute('inert');

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const animationFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCart();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        drawer.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;

      if (previouslyFocused?.isConnected) {
        window.requestAnimationFrame(() => previouslyFocused.focus());
      }
    };
  }, [closeCart, isOpen]);

  // 免運門檻（讀公開業務設定，串接後台「配送與取貨」）
  const [freeShipThreshold, setFreeShipThreshold] = useState(0);
  useEffect(() => {
    let active = true;
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s: unknown) => {
        if (!active || !isRecord(s)) return;
        const ds = s.delivery_settings;
        const t =
          isRecord(ds) && typeof ds.free_delivery_threshold === 'number'
            ? ds.free_delivery_threshold
            : 0;
        setFreeShipThreshold(t);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
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
        ref={drawerRef}
        id="shop-cart-sidebar"
        role="dialog"
        aria-modal={isOpen ? true : undefined}
        aria-hidden={!isOpen}
        aria-label="購物車"
        tabIndex={-1}
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
                購物車
              </h2>
              <p className="text-xs sm:text-sm text-moon-muted tracking-wide">
                共 {totalItems} 件商品
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeCart}
              className="flex min-h-11 min-w-11 items-center justify-center p-2 transition-colors hover:bg-moon-border"
              aria-label="關閉購物車"
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
              <p className="text-sm tracking-wider mb-2">購物車是空的</p>
              <p className="text-xs text-moon-muted/60 mb-8">加入甜點開始選購吧</p>
              <button
                onClick={closeCart}
                className="border border-moon-border text-moon-text px-8 py-3 text-sm tracking-widest hover:bg-moon-border transition-colors"
              >
                繼續選購
              </button>
            </div>
          ) : (
            <>
              {/* 商品列表 */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-moon-border p-4 hover:border-moon-muted transition-colors animate-fadeIn"
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
                            —
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
                {/* 免運進度（讀後台配送設定）*/}
                {freeShipThreshold > 0 && (
                  <div className="mb-4">
                    {totalPrice >= freeShipThreshold ? (
                      <p className="text-xs text-moon-accent tracking-wider text-center">🎉 已達免運門檻</p>
                    ) : (
                      <>
                        <p className="text-xs text-moon-muted tracking-wider mb-2 text-center">
                          再買 <span className="text-moon-accent">${freeShipThreshold - totalPrice}</span> 享免運
                        </p>
                        <div className="h-1 w-full bg-moon-border/40 overflow-hidden">
                          <div
                            className="h-full bg-moon-accent transition-all duration-500"
                            style={{ width: `${Math.min(100, (totalPrice / freeShipThreshold) * 100)}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
                {/* 價格明細 */}
                <div className="space-y-2 mb-4 sm:mb-6">
                  {/* 小計 */}
                  <div className="flex justify-between items-baseline text-moon-muted">
                    <span className="text-xs tracking-widest">小計</span>
                    <span className="text-sm">${totalPrice}</span>
                  </div>

                  {/* 優惠折扣 */}
                  {promoCode && discountAmount > 0 && (
                    <div className="flex justify-between items-baseline text-moon-accent">
                      <span className="text-xs tracking-widest">
                        折扣 ({promoCode})
                      </span>
                      <span className="text-sm">-${discountAmount}</span>
                    </div>
                  )}

                  {/* 總計 */}
                  <div className="flex justify-between items-baseline pt-3 border-t border-moon-border">
                    <span className="text-xs sm:text-sm tracking-widest text-moon-muted">總計</span>
                    <span className="text-2xl sm:text-3xl font-light text-moon-accent tracking-wide">
                      <span className="text-lg sm:text-xl mr-1">$</span>{finalPrice}
                    </span>
                  </div>
                </div>

                {/* 結帳按鈕 */}
                <Link
                  href="/checkout"
                  onClick={() => {
                    trackShopEvent('begin_checkout', {
                      currency: 'TWD',
                      value: finalPrice,
                      coupon: promoCode || undefined,
                      discount: discountAmount || undefined,
                      items: items.map(item => ({
                        item_id: item.id,
                        item_name: item.name,
                        item_variant: item.variant_name || '單一規格',
                        price: item.price,
                        quantity: item.quantity,
                      })),
                    });
                    closeCart();
                  }}
                  className="block w-full bg-moon-accent text-moon-black py-3 sm:py-4 text-xs sm:text-sm tracking-widest hover:bg-moon-text transition-colors text-center"
                >
                  前往結帳
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
