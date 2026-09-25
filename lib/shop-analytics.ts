import { readKwAttrCookie } from '@/src/lib/attribution';

export const SHOP_ANALYTICS_SITE_ID = 'shop';
export const SHOP_ATTRIBUTION_STORAGE_KEY = 'moonmoon_attribution';

const ATTRIBUTION_KEYS = [
  'from',
  'mbti',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'landing_url',
  'captured_at',
] as const;

type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export type ShopAttribution = Partial<Record<AttributionKey, string | null>>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function compactRecord(record: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, string] => (
      typeof entry[1] === 'string' && entry[1].trim().length > 0
    ))
  );
}

export function readShopAttribution(): ShopAttribution {
  if (typeof window === 'undefined') return {};

  let local: Partial<Record<AttributionKey, string | null>> = {};
  try {
    const raw = window.localStorage.getItem(SHOP_ATTRIBUTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      local = Object.fromEntries(
        ATTRIBUTION_KEYS.map((key) => [key, asStringOrNull(parsed[key])])
      );
    }
  } catch {
    local = {};
  }

  // R4：kw_attr 是跨子網域的第一接觸歸因來源（例如使用者先在 kiwimu.com 帶
  // UTM 落地，再透過站內連結進到 shop，shop 自己的 localStorage 從沒看過那組 UTM）。
  // cookie 讀取失敗或缺值時完全 fallback 回舊的 localStorage 行為，不影響既有流程。
  let cookie: ReturnType<typeof readKwAttrCookie> = {};
  try {
    cookie = readKwAttrCookie();
  } catch {
    cookie = {};
  }

  return {
    from: cookie.from ?? local.from ?? null,
    mbti: cookie.mbti ?? local.mbti ?? null,
    utm_source: cookie.src ?? local.utm_source ?? null,
    utm_medium: cookie.med ?? local.utm_medium ?? null,
    utm_campaign: cookie.cmp ?? local.utm_campaign ?? null,
    utm_content: cookie.cnt ?? local.utm_content ?? null,
    utm_term: cookie.trm ?? local.utm_term ?? null,
    landing_url: local.landing_url ?? null,
    captured_at: local.captured_at ?? null,
  };
}

export function getShopAnalyticsContext(attribution: ShopAttribution = readShopAttribution()) {
  return {
    site_id: SHOP_ANALYTICS_SITE_ID,
    source_site: SHOP_ANALYTICS_SITE_ID,
    ...compactRecord({
      source_from: attribution.from,
      mbti_type: attribution.mbti,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      landing_url: attribution.landing_url,
    }),
  };
}

export function trackShopEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  attribution?: ShopAttribution
) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', eventName, {
    ...getShopAnalyticsContext(attribution),
    ...params,
  });
}

// R5：checkout/page.tsx（下單當下，銀行轉帳流程）與 purchase-tracker.tsx
// （/order/success，LINE Pay 流程）是同一筆訂單可能各自觸發 purchase 的
// 兩個路徑 — 同一個 orderId 只能算一次。用同一把 sessionStorage key
// 讓兩邊共用同一份「這筆訂單追蹤過了嗎」狀態。
const PURCHASE_TRACKED_STORAGE_PREFIX = 'shop_purchase_tracked:';

export function hasPurchaseBeenTracked(transactionId: string): boolean {
  if (typeof window === 'undefined' || !transactionId) return false;
  try {
    return window.sessionStorage.getItem(`${PURCHASE_TRACKED_STORAGE_PREFIX}${transactionId}`) === '1';
  } catch {
    return false;
  }
}

export function markPurchaseTracked(transactionId: string): void {
  if (typeof window === 'undefined' || !transactionId) return;
  try {
    window.sessionStorage.setItem(`${PURCHASE_TRACKED_STORAGE_PREFIX}${transactionId}`, '1');
  } catch {
    // sessionStorage 不可用時直接放棄記錄，事件本身仍已送出，不影響追蹤。
  }
}
