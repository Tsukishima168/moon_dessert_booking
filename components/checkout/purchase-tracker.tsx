'use client';

import { useEffect } from 'react';

import type { OrderItem } from '@/lib/supabase';

interface PurchaseTrackerProps {
  transactionId: string;
  value: number;
  items: OrderItem[];
}

export function PurchaseTracker({ transactionId, value, items }: PurchaseTrackerProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag || !transactionId) return;

    const storageKey = `shop_purchase_tracked:${transactionId}`;
    try {
      if (window.sessionStorage.getItem(storageKey) === '1') return;
    } catch {
      // Analytics should still fire if sessionStorage is unavailable.
    }

    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value,
      currency: 'TWD',
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_variant: item.variant_name || '單一規格',
        price: item.price,
        quantity: item.quantity,
      })),
    });

    try {
      window.sessionStorage.setItem(storageKey, '1');
    } catch {
      // Ignore storage failures after the event has been sent.
    }
  }, [items, transactionId, value]);

  return null;
}
