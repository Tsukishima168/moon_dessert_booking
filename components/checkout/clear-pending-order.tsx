'use client';

import { useEffect } from 'react';

const PENDING_ORDER_STORAGE_KEY = 'moonmoon_pending_order';

export function ClearPendingOrder() {
  useEffect(() => {
    try {
      window.localStorage.removeItem(PENDING_ORDER_STORAGE_KEY);
    } catch (error) {
      console.error('清除待付款訂單快取失敗:', error);
    }
  }, []);

  return null;
}
