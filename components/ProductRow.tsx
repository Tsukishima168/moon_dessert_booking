'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import type { MenuItemWithVariants } from '@/lib/supabase';
import { trackShopEvent } from '@/lib/shop-analytics';
import { useCartStore } from '@/store/cartStore';
import { getDeliveryTypeLabel } from '@/lib/delivery-type';

interface ProductRowProps {
    item: MenuItemWithVariants;
    displayOnly?: boolean;
    index?: number;
}

/** Desktop ordering row. Product data and cart actions remain shared with the existing flow. */
export default function ProductRow({ item, displayOnly = false, index = 0 }: ProductRowProps) {
    const addItem = useCartStore((state) => state.addItem);
    const openCart = useCartStore((state) => state.openCart);
    const [selectedVariant, setSelectedVariant] = useState(item.variants[0]);
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);

    const handleAddToCart = () => {
        if (!selectedVariant || isSoldOut || displayOnly) return;
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

    const isSoldOut = !item.is_available || item.variants.length === 0;

    // 序號：01 / 02 / 03 樣式
    const serialNo = String(index + 1).padStart(2, '0');

    // 配送標示（P2-lite）
    const deliveryLabel = getDeliveryTypeLabel(item.delivery_type);
    const isPickupOnly = item.delivery_type === 'pickup_only';
    const productHref = `/product/${item.slug || item.id}`;

    if (isSoldOut && !displayOnly) {
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
                <div className="shop-row-copy flex-1 min-w-0">
                    <h3 className="text-moon-muted line-through text-sm tracking-wide">{item.name}</h3>
                </div>
                <span className="text-xs text-moon-muted tracking-widest shrink-0">{item.is_available ? '暫不開放預訂' : '已售完'}</span>
            </div>
        );
    }

    return (
        <div className="shop-product-row group flex items-center gap-5 lg:gap-8 py-4 lg:py-5 px-4 border-b border-moon-border/20 hover:bg-moon-dark/40 transition-all duration-300">
            {/* 序號 */}
            <span className="text-[10px] text-moon-muted/40 font-mono w-5 shrink-0 group-hover:text-moon-accent/50 transition-colors">
                {serialNo}
            </span>

            {/* 縮圖 — 固定 80px，不主導視覺 */}
            <div className="shop-row-photo relative w-20 h-20 lg:w-24 lg:h-24 shrink-0 overflow-hidden bg-moon-gray">
                {item.image_url && item.image_url.trim() !== '' ? (
                    <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="112px"
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
            <div className="shop-row-copy flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-1">
                    <h3 className="text-sm lg:text-base font-light text-moon-accent tracking-wide">
                        {item.name}
                    </h3>
                    {item.category && (
                        <span className="text-[10px] text-moon-muted/50 tracking-widest shrink-0 hidden lg:inline">
                            {item.category}
                        </span>
                    )}
                    {deliveryLabel && (
                        <span
                            className={`text-[9px] tracking-widest px-1.5 py-0.5 border shrink-0 hidden lg:inline ${isPickupOnly
                                    ? 'border-moon-gold text-moon-gold'
                                    : 'border-moon-border/60 text-moon-muted'
                                }`}
                        >
                            {deliveryLabel}
                        </span>
                    )}
                </div>
                {item.description && (
                    <p className="text-xs text-moon-muted/70 leading-relaxed line-clamp-1 lg:line-clamp-2">
                        {item.description}
                    </p>
                )}
                <Link
                    href={productHref}
                    className="text-[10px] text-moon-muted/60 hover:text-moon-accent tracking-wider mt-1 inline-block transition-colors"
                >
                    查看詳情 →
                </Link>
            </div>

            {/* 右側：規格選擇 + 價格 + 操作（桌面橫排） */}
            <div className="shop-row-controls shrink-0 flex items-center gap-3 lg:gap-5">
                {/* 規格選擇 */}
                {!displayOnly && item.variants.length > 1 && (
                    <div className="hidden lg:flex flex-col gap-1">
                        {item.variants.map((variant) => (
                            <button
                                key={variant.id}
                                aria-pressed={selectedVariant?.id === variant.id}
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
                {(!displayOnly || (selectedVariant?.price ?? item.price) > 0) && <div className="text-lg lg:text-xl font-light text-moon-accent tracking-wide whitespace-nowrap">
                    <span className="text-xs mr-0.5">$</span>
                    {selectedVariant?.price ?? item.price}
                </div>}

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
                                aria-label={`減少 ${item.name} 數量`}
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 hover:bg-moon-border/40 transition-colors"
                            >
                                <Minus size={11} className="text-moon-text" />
                            </button>
                            <span className="px-2.5 text-xs text-moon-text min-w-[2rem] text-center">{quantity}</span>
                            <button
                                aria-label={`增加 ${item.name} 數量`}
                                onClick={() => setQuantity(quantity + 1)}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-1.5 hover:bg-moon-border/40 transition-colors"
                            >
                                <Plus size={11} className="text-moon-text" />
                            </button>
                        </div>
                        {/* 加入購物車 */}
                        <button
                            onClick={handleAddToCart}
                            className={`flex items-center gap-1.5 text-[11px] tracking-widest px-3 py-2 transition-all whitespace-nowrap ${added
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/40 animate-added-pop'
                                    : 'bg-moon-accent text-moon-black hover:bg-moon-text'
                                }`}
                        >
                            <ShoppingCart size={11} />
                            {added ? '已加入' : '加入購物車'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
