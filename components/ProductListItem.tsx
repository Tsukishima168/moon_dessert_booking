'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { MenuItemWithVariants } from '@/lib/supabase';
import { useCartStore } from '@/store/cartStore';

interface ProductListItemProps {
  item: MenuItemWithVariants;
  displayOnly?: boolean; // 只展示，不開放預訂（例如飲料）
}

export default function ProductListItem({ item, displayOnly = false }: ProductListItemProps) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const [selectedVariant, setSelectedVariant] = useState(item.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: `${item.id}-${selectedVariant.id}`,
        name: item.name,
        price: selectedVariant.price,
        image_url: item.image_url,
        variant_name: selectedVariant.variant_name,
      });
    }
    openCart();
    setQuantity(1);
    setIsExpanded(false); // 加入後自動收合
  };

  // 是否為純展示（例如飲料）
  const isDisplayOnly =
    displayOnly ||
    (!item.is_available && item.variants.length === 0 && /drink/i.test(item.category || ''));

  // 商品真正售完的判斷：只看 is_available === false
  if (item.is_available === false && !isDisplayOnly) {
    return (
      <div className="border-b border-moon-border/30 py-3 px-4 opacity-50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm text-moon-muted line-through">{item.name}</h3>
          </div>
          <span className="text-xs text-moon-muted tracking-wider">SOLD OUT</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-moon-border/30">
      {/* 收合狀態 - 純文字列表 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-3 px-4 hover:bg-moon-gray/30 transition-colors text-left"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base text-moon-accent font-light tracking-wide truncate">
              {item.name}
            </h3>
            <p className="text-xs sm:text-sm text-moon-muted mt-1 line-clamp-2">
              {item.description && item.description.trim() !== ''
                ? item.description
                : '甜點說明準備中'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {item.recommended && (
              <span className="text-xs bg-moon-accent text-moon-black px-2 py-0.5 tracking-wider hidden sm:inline">
                推薦
              </span>
            )}
            {isExpanded ? (
              <ChevronUp size={18} className="text-moon-muted" />
            ) : (
              <ChevronDown size={18} className="text-moon-muted" />
            )}
          </div>
        </div>
      </button>

      {/* 展開狀態 - 完整資訊 */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-moon-dark/50">
          {/* 商品圖片 */}
          <div className="relative aspect-square w-full bg-moon-gray mb-4 overflow-hidden">
            {item.image_url && item.image_url.trim() !== '' ? (
              <Image
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl opacity-20">🍰</span>
            </div>
          </div>

          {/* 商品描述 */}
          {item.description && (
            <p className="text-xs sm:text-sm text-moon-muted leading-relaxed mb-2 sm:mb-3">
              {item.description}
            </p>
          )}

          {/* 僅門市供應提示（例如飲料） */}
          {isDisplayOnly && (
            <p className="text-[11px] sm:text-xs text-moon-muted/80 italic mb-4">
              此品項目前僅於月島甜點店內提供，暫不開放線上預訂。
            </p>
          )}

          {/* 規格選擇（僅可預訂的商品才顯示） */}
          {!isDisplayOnly && item.variants.length > 1 && (
            <div className="mb-4">
              <label className="text-xs text-moon-muted tracking-wider mb-2 block">
                選擇規格
              </label>
              <div className="flex gap-2">
                {item.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`
                      flex-1 py-2 px-3 text-xs tracking-wider border transition-all
                      ${
                        selectedVariant.id === variant.id
                          ? 'border-moon-accent bg-moon-accent text-moon-black'
                          : 'border-moon-border text-moon-muted hover:border-moon-muted'
                      }
                    `}
                  >
                    <div>{variant.variant_name}</div>
                    <div className="font-light text-xs">${variant.price}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 數量和加入購物車（僅可預訂的商品才顯示） */}
          {!isDisplayOnly && (
            <div className="flex items-center gap-3">
              {/* 數量選擇 */}
              <div className="flex items-center border border-moon-border">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-moon-border transition-colors"
                >
                  <Minus size={14} className="text-moon-text" />
                </button>
                <span className="px-4 text-sm text-moon-text">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-moon-border transition-colors"
                >
                  <Plus size={14} className="text-moon-text" />
                </button>
              </div>

              {/* 加入購物車按鈴 */}
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-moon-accent text-moon-black py-2.5 text-xs sm:text-sm tracking-widest hover:bg-moon-text transition-colors"
              >
                加入購物車 ${selectedVariant?.price ? selectedVariant.price * quantity : ''}
              </button>
            </div>
          )}

          {/* MBTI 推薦理由 */}
          {item.recommended && item.reason && (
            <div className="mt-3 pt-3 border-t border-moon-border/30">
              <p className="text-xs text-moon-accent/80 italic text-center">
                💭 {item.reason}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
