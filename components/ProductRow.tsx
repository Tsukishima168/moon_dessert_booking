'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { MenuItemWithVariants } from '@/lib/supabase';
import { useCartStore } from '@/store/cartStore';

interface ProductRowProps {
    item: MenuItemWithVariants;
    displayOnly?: boolean;
    index?: number;
}

/**
 * ProductRow — 桌面版精品菜單列表樣式
 * 
 * 設計邏輯：
 * - 橫排：左側小縮圖（固定 96×96）+ 右側文字資訊 + 最右操作區
 * - 圖片不主導，文案敘事為主（品牌訂購頁，不是電商 grid）
 * - hover 時左側橫線滑入，整行有微動效
 */
export default function ProductRow({ item, displayOnly = false, index = 0 }: ProductRowProps) {
    const addItem = useCartStore((state) => state.addItem);
    const openCart = useCartStore((state) => state.openCart);
    const [selectedVariant, setSelectedVariant] = useState(item.variants[0]);
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);

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
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'add_to_cart', {
                currency: 'TWD',
                value: selectedVariant.price * quantity,
                items: [{
                    item_id: item.id,
                    item_name: item.name,
                    price: selectedVariant.price,
                    quantity: quantity,
                }]
            });
        }
        setAdded(true);
        setQuantity(1);
        setTimeout(() => setAdded(false), 2000);
    };

    const isSoldOut = !item.is_available || item.variants.length === 0;

    // 序號：01 / 02 / 03 樣式
    const serialNo = String(index + 1).padStart(2, '0');

    if (isSoldOut) {
        return (
            <div className="flex items-center gap-6 py-5 px-4 border-b border-moon-border/20 opacity-40">
                <span className="text-xs text-moon-muted/40 font-mono w-6 shrink-0">{serialNo}</span>
                <div className="w-16 h-16 bg-moon-gray/40 shrink-0 flex items-center justify-center">
                    {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} width={64} height={64} className="object-cover w-full h-full grayscale opacity-50" />
                    ) : (
                        <span className="text-moon-muted/30">—</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-moon-muted line-through text-sm tracking-wide">{item.name}</h3>
                </div>
                <span className="text-xs text-moon-muted tracking-widest shrink-0">已售完</span>
            </div>
        );
    }

    return (
        <div className="group flex items-center gap-5 lg:gap-8 py-4 lg:py-5 px-4 border-b border-moon-border/20 hover:bg-moon-dark/40 transition-all duration-300">
            {/* 序號 */}
            <span className="text-[10px] text-moon-muted/40 font-mono w-5 shrink-0 group-hover:text-moon-accent/50 transition-colors">
                {serialNo}
            </span>

            {/* 縮圖 — 固定 80px，不主導視覺 */}
            <div className="relative w-20 h-20 lg:w-24 lg:h-24 shrink-0 overflow-hidden bg-moon-gray">
                {item.image_url && item.image_url.trim() !== '' ? (
                    <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="96px"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-moon-muted/20 text-xl">—</span>
                    </div>
                )}
                {item.recommended && (
                    <div className="absolute top-1 left-1 bg-moon-accent text-moon-black text-[8px] px-1 py-0.5 tracking-wider">
                        薦
                    </div>
                )}
            </div>

            {/* 主要文字資訊 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-1">
                    <h3 className="text-sm lg:text-base font-light text-moon-accent tracking-wide truncate">
                        {item.name}
                    </h3>
                    {item.category && (
                        <span className="text-[10px] text-moon-muted/50 tracking-widest shrink-0 hidden lg:inline">
                            {item.category}
                        </span>
                    )}
                </div>
                {item.description && (
                    <p className="text-xs text-moon-muted/70 leading-relaxed line-clamp-1 lg:line-clamp-2">
                        {item.description}
                    </p>
                )}
            </div>

            {/* 右側：規格選擇 + 價格 + 操作（桌面橫排） */}
            <div className="shrink-0 flex items-center gap-3 lg:gap-5">
                {/* 規格選擇 */}
                {!displayOnly && item.variants.length > 1 && (
                    <div className="hidden lg:flex flex-col gap-1">
                        {item.variants.map((variant) => (
                            <button
                                key={variant.id}
                                onClick={() => setSelectedVariant(variant)}
                                className={`text-[10px] tracking-wider px-2.5 py-1 border transition-all whitespace-nowrap ${selectedVariant.id === variant.id
                                        ? 'border-moon-accent bg-moon-accent text-moon-black'
                                        : 'border-moon-border/60 text-moon-muted hover:border-moon-muted/60'
                                    }`}
                            >
                                {variant.variant_name} · ${variant.price}
                            </button>
                        ))}
                    </div>
                )}

                {/* 規格選擇（精簡版 — 只有一個 list 的時候） */}
                {!displayOnly && item.variants.length === 1 && (
                    <div className="hidden lg:block text-xs text-moon-muted/60 whitespace-nowrap">
                        {item.variants[0].variant_name !== '標準' && item.variants[0].variant_name}
                    </div>
                )}

                {/* 價格 */}
                <div className="text-lg lg:text-xl font-light text-moon-accent tracking-wide whitespace-nowrap">
                    <span className="text-xs mr-0.5">$</span>
                    {selectedVariant.price}
                </div>

                {/* 操作區 */}
                {displayOnly ? (
                    <span className="text-[10px] text-moon-muted/60 tracking-widest hidden lg:inline whitespace-nowrap">
                        門市供應
                    </span>
                ) : (
                    <div className="flex items-center gap-2">
                        {/* 數量 */}
                        <div className="flex items-center border border-moon-border/60">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="p-1.5 hover:bg-moon-border/40 transition-colors"
                            >
                                <Minus size={11} className="text-moon-text" />
                            </button>
                            <span className="px-2.5 text-xs text-moon-text min-w-[2rem] text-center">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="p-1.5 hover:bg-moon-border/40 transition-colors"
                            >
                                <Plus size={11} className="text-moon-text" />
                            </button>
                        </div>
                        {/* 加入購物車 */}
                        <button
                            onClick={handleAddToCart}
                            className={`flex items-center gap-1.5 text-[11px] tracking-widest px-3 py-2 transition-all whitespace-nowrap ${added
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                    : 'bg-moon-accent text-moon-black hover:bg-moon-text'
                                }`}
                        >
                            <ShoppingCart size={11} />
                            {added ? '已加入' : '加入'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
