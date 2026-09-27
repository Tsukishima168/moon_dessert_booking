'use client';

import { useEffect } from 'react';
import { trackShopEvent } from '@/lib/shop-analytics';

interface ProductViewTrackerProps {
  itemId: string;
  itemName: string;
  price: number;
}

/**
 * ProductViewTracker — 商品頁 view_item（R5）。
 * 掛在 app/product/[idOrSlug]/page.tsx（Server Component），
 * 每次頁面載入送一次真實的 view_item，不再靠 GA4 後台用 page_view 規則偽造。
 */
export default function ProductViewTracker({ itemId, itemName, price }: ProductViewTrackerProps) {
  useEffect(() => {
    trackShopEvent('view_item', {
      currency: 'TWD',
      value: price,
      items: [
        {
          item_id: itemId,
          item_name: itemName,
          price,
          quantity: 1,
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  return null;
}
