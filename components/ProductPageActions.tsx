'use client';

import { useState } from 'react';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import type { MenuItemWithVariants } from '@/lib/supabase';
import { trackShopEvent } from '@/lib/shop-analytics';
import { useCartStore } from '@/store/cartStore';

interface ProductPageActionsProps {
  item: Pick<MenuItemWithVariants, 'id' | 'name' | 'image_url' | 'is_available' | 'variants'>;
}

/**
 * ProductPageActions — 商品詳情頁的規格選擇 + 加入購物車
 * 沿用 components/ProductRow.tsx 的 cart 邏輯（useCartStore / trackShopEvent），
 * 僅版型改為直式（詳情頁）而非橫排列表。
 */
export default function ProductPageActions({ item }: ProductPageActionsProps) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const [selectedVariant, setSelectedVariant] = useState(item.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const isSoldOut = !item.is_available || item.variants.length === 0;

  if (isSoldOut) {
    return (
      <div className="border border-moon-border/60 px-4 py-3 text-sm text-moon-muted tracking-widest text-center">
        已售完
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedVariant) return;

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
    trackShopEvent('add_to_cart', {
      currency: 'TWD',
      value: selectedVariant.price * quantity,
      items: [{
        item_id: item.id,
        item_name: item.name,
        item_variant: selectedVariant.variant_name,
        price: selectedVariant.price,
        quantity,
      }],
    });
    setAdded(true);
    setQuantity(1);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-4">
      {item.variants.length > 1 && (
        <div>
          <label className="text-xs text-moon-muted tracking-wider mb-2 block">
            選擇規格
          </label>
          <div className="flex flex-wrap gap-2">
            {item.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariant(variant)}
                className={`text-xs tracking-wider px-3 py-2 border transition-all ${selectedVariant?.id === variant.id
                    ? 'border-moon-accent bg-moon-accent text-moon-black'
                    : 'border-moon-border/60 text-moon-muted hover:border-moon-muted/60'
                  }`}
              >
                {variant.variant_name} · ${variant.price}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center border border-moon-border/60 shrink-0">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2.5 hover:bg-moon-border/40 transition-colors"
          >
            <Minus size={14} className="text-moon-text" />
          </button>
          <span className="px-4 text-sm text-moon-text min-w-[2.5rem] text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="p-2.5 hover:bg-moon-border/40 transition-colors"
          >
            <Plus size={14} className="text-moon-text" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className={`flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm tracking-widest px-4 py-3 transition-all ${added
              ? 'bg-green-500/20 text-green-400 border border-green-500/40'
              : 'bg-moon-accent text-moon-black hover:bg-moon-text'
            }`}
        >
          <ShoppingCart size={14} />
          {added ? '已加入購物車' : `加入購物車 · $${selectedVariant ? selectedVariant.price * quantity : ''}`}
        </button>
      </div>
    </div>
  );
}
