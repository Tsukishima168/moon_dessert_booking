'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';
import { MenuItemWithVariants } from '@/lib/supabase';
import { useCartStore } from '@/store/cartStore';

interface ProductCardProps {
  item: MenuItemWithVariants;
}

export default function ProductCard({ item }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const [selectedVariant, setSelectedVariant] = useState(item.variants[0]);
  const [quantity, setQuantity] = useState(1);

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
  };

  if (!item.is_available || item.variants.length === 0) {
    return (
      <div className="border border-moon-border bg-moon-dark p-6 opacity-50">
        <div className="relative aspect-square w-full bg-moon-gray mb-6 flex items-center justify-center overflow-hidden">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover grayscale"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <span className="text-6xl opacity-30">🍰</span>
          )}
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-moon-muted text-sm tracking-widest">SOLD OUT</span>
          </div>
        </div>
        <h3 className="text-xl font-light text-moon-muted tracking-wide mb-2">
          {item.name}
        </h3>
        <p className="text-sm text-moon-muted/60 leading-relaxed">
          {item.description}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-moon-border bg-moon-dark hover:border-moon-muted transition-all duration-500 group">
      {/* 商品圖片 */}
      <div className="relative aspect-square w-full bg-moon-gray overflow-hidden">
        {item.image_url && item.image_url.trim() !== '' ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              // 圖片載入失敗時顯示預設圖示
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        {/* 預設圖示（無圖片或載入失敗時顯示）*/}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl opacity-20">🍰</span>
        </div>
        
        {/* 分類標籤 */}
        <div className="absolute top-4 left-4">
          <span className="text-xs tracking-widest text-moon-muted border border-moon-border bg-moon-black/80 px-3 py-1 backdrop-blur-sm">
            {item.category}
          </span>
        </div>
      </div>

      {/* 商品資訊 */}
      <div className="p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-light text-moon-accent tracking-wide mb-2 sm:mb-3">
          {item.name}
        </h3>
        
        <p className="text-xs sm:text-sm text-moon-muted leading-relaxed mb-4 sm:mb-6 min-h-[2.5rem] sm:min-h-[3rem]">
          {item.description}
        </p>

        {/* 變體選擇 */}
        {item.variants.length > 1 && (
          <div className="mb-3 sm:mb-4">
            <div className="flex gap-2">
              {item.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`
                    flex-1 py-2 px-2 sm:px-3 text-[10px] sm:text-xs tracking-wider border transition-all
                    ${
                      selectedVariant.id === variant.id
                        ? 'border-moon-accent bg-moon-accent text-moon-black'
                        : 'border-moon-border text-moon-muted hover:border-moon-muted'
                    }
                  `}
                >
                  <div>{variant.variant_name}</div>
                  <div className="font-light">${variant.price}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 價格 */}
        <div className="text-xl sm:text-2xl font-light text-moon-accent mb-3 sm:mb-4 tracking-wide">
          <span className="text-base sm:text-lg mr-1">$</span>{selectedVariant.price}
        </div>

        {/* 數量選擇 */}
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center border border-moon-border">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-2 hover:bg-moon-border transition-colors"
            >
              <Minus size={14} className="text-moon-text sm:w-4 sm:h-4" />
            </button>
            <span className="px-4 sm:px-6 text-sm sm:text-base text-moon-text">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="p-2 hover:bg-moon-border transition-colors"
            >
              <Plus size={14} className="text-moon-text sm:w-4 sm:h-4" />
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-moon-accent text-moon-black py-2.5 sm:py-3 text-xs sm:text-sm tracking-widest hover:bg-moon-text transition-colors"
          >
            <span className="hidden sm:inline">ADD TO CART</span>
            <span className="sm:hidden">加入購物車</span>
          </button>
        </div>
      </div>
    </div>
  );
}
