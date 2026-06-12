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

  try {
    const raw = window.localStorage.getItem(SHOP_ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      ATTRIBUTION_KEYS.map((key) => [key, asStringOrNull(parsed[key])])
    ) as ShopAttribution;
  } catch {
    return {};
  }
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
