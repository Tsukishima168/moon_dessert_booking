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
    __KW_GA_ENABLED?: boolean;
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

  // v1.1 修訂：UTM 一律「整組」取用 — cookie 有 src 就整組用 cookie 的
  // src/med/cmp/cnt/trm，否則整組用 localStorage 的備援，不逐欄混拼
  // （混拼會把不同來源、不同時間點的 utm_source / utm_campaign 兜在一起，
  // 產生語意上根本不存在的歸因組合）。
  const utmSet = cookie.src
    ? {
        utm_source: cookie.src ?? null,
        utm_medium: cookie.med ?? null,
        utm_campaign: cookie.cmp ?? null,
        utm_content: cookie.cnt ?? null,
        utm_term: cookie.trm ?? null,
      }
    : {
        utm_source: local.utm_source ?? null,
        utm_medium: local.utm_medium ?? null,
        utm_campaign: local.utm_campaign ?? null,
        utm_content: local.utm_content ?? null,
        utm_term: local.utm_term ?? null,
      };

  return {
    from: cookie.from ?? local.from ?? null,
    mbti: cookie.mbti ?? local.mbti ?? null,
    ...utmSet,
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

/**
 * 送一個 shop 電商事件。回傳這次呼叫是否「真的排進 dataLayer 佇列」了
 * （window.gtag 是不是一個 function）— 呼叫端（尤其是 purchase 的
 * sessionStorage 去重）要靠這個回傳值決定能不能標記「已追蹤」，
 * 不能無條件標記，否則事件明明沒送出、卻永遠被當成送過了。
 */
export function trackShopEvent(
  eventName: string,
  params: Record<string, unknown> = {},
  attribution?: ShopAttribution
): boolean {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false;
  // Off the GA host allowlist (localhost, previews) nothing is sent — report false
  // so callers like the purchase dedupe don't mark the event as tracked.
  if (window.__KW_GA_ENABLED !== true) return false;

  window.gtag('event', eventName, {
    ...getShopAnalyticsContext(attribution),
    ...params,
  });
  return true;
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
