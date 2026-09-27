'use client';

import { useEffect } from 'react';

import type { OrderItem } from '@/lib/supabase';
import { trackShopEvent, hasPurchaseBeenTracked, markPurchaseTracked } from '@/lib/shop-analytics';

interface PurchaseTrackerProps {
  transactionId: string;
  value: number;
  items: OrderItem[];
}

export function PurchaseTracker({ transactionId, value, items }: PurchaseTrackerProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || !transactionId) return;

    // 同一筆訂單也可能已經在 app/checkout/page.tsx（銀行轉帳分支）觸發過
    // purchase — 兩邊共用同一把 sessionStorage key，避免同一筆訂單算兩次。
    if (hasPurchaseBeenTracked(transactionId)) return;

    const tracked = trackShopEvent('purchase', {
      transaction_id: transactionId,
      value,
      currency: 'TWD',
      payment_method: 'line_pay',
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_variant: item.variant_name || '單一規格',
        price: item.price,
        quantity: item.quantity,
      })),
    });

    // 只有事件真的排進 dataLayer 才標記「追蹤過了」；沒送出就不標記，
    // 避免明明沒送出的事件被永久當成已送出（曾經因為 gtag stub 還沒
    // 定義好而整批漏掉，詳見 components/GoogleAnalytics.tsx 的註解）。
    if (tracked) {
      markPurchaseTracked(transactionId);
    }
  }, [items, transactionId, value]);

  return null;
}
