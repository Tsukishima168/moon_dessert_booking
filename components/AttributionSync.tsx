'use client';

import { useEffect } from 'react';
import { writeKwAttrCookieFromLocation } from '@/src/lib/attribution';

/**
 * AttributionSync — R4 跨站第一接觸歸因 cookie（kw_attr）寫入器。
 * 掛在 root layout，每次完整頁面載入（含從其他 *.kiwimu.com 站跨站進站）時
 * 依規則嘗試寫入／更新 cookie；只在 hostname 結尾為 kiwimu.com 時動作。
 * 不渲染任何東西，任何錯誤都在 writeKwAttrCookieFromLocation 內部吞掉，
 * 絕不影響頁面渲染或結帳流程。
 */
export default function AttributionSync() {
  useEffect(() => {
    writeKwAttrCookieFromLocation();
  }, []);

  return null;
}
