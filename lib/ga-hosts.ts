// GA4 host allowlist shared by the <head> bootstrap script (app/layout.tsx)
// and the gtag.js loader (components/GoogleAnalytics.tsx).
// R1 (UPGRADE_SPEC v1.1): kiwimu.com + subdomains + the 4 legacy production
// vercel.app aliases (real users, likely LINE LIFF entry). Blocks localhost,
// 127.0.0.1 and every other *.vercel.app preview.

import { ENTRY_FROM_WINDOW_MS, FROM_PATTERN, KW_ATTR_COOKIE_NAME } from '@/src/lib/attribution';

export const GA_ID = process.env.NEXT_PUBLIC_GA4_ID || 'G-DM6F27KL8B';

export const LEGACY_PRODUCTION_ALIASES = [
  'moon-map-original.vercel.app',
  'moonmoon-dessert-passport.vercel.app',
  'moon-dessert-booking.vercel.app',
  'moonmoon-gacha.vercel.app',
];

export function isProductionHost(hostname: string): boolean {
  if (hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com')) return true;
  return LEGACY_PRODUCTION_ALIASES.includes(hostname);
}

/**
 * Inline <head> script: defines the dataLayer/gtag stub and, on allowed hosts,
 * queues gtag('js') + gtag('config') synchronously — before any component
 * hydrates — so events queued by PurchaseTracker/ProductViewTracker on a full
 * page load always sit behind `config` in dataLayer and are not dropped when
 * gtag.js arrives. Sets window.__KW_GA_ENABLED for trackShopEvent.
 *
 * The config call also carries `entry_from` (the internal cross-site entry of
 * THIS landing) when known: the original query's `from`, else kw_attr.from if
 * kw_attr.from_ts is < 30 minutes old, else omitted. Same rules/limits as
 * src/lib/attribution.ts (clampFromField: strip control chars, trim, cap 64,
 * must match FROM_PATTERN). This script runs BEFORE the head script that strips
 * tracking params from the URL, so window.location.search is still intact;
 * __SHOP_INITIAL_SEARCH__ is preferred if that order ever flips. A malformed
 * URL `from` yields no entry_from and does not fall back to the cookie.
 */
export function buildGaBootstrapScript(enabledInThisBuild: boolean): string {
  return `
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
(function () {
  var h = window.location.hostname;
  var aliases = ${JSON.stringify(LEGACY_PRODUCTION_ALIASES)};
  var ok = ${enabledInThisBuild ? 'true' : 'false'} && (h === 'kiwimu.com' || h.slice(-11) === '.kiwimu.com' || aliases.indexOf(h) !== -1);
  window.__KW_GA_ENABLED = ok;
  if (ok) {
    var config = { page_path: window.location.pathname };
    var entryFrom = resolveEntryFrom();
    if (entryFrom) config.entry_from = entryFrom;
    window.gtag('js', new Date());
    window.gtag('config', ${JSON.stringify(GA_ID)}, config);
  }

  function clampFrom(value) {
    if (typeof value !== 'string') return undefined;
    var v = value.replace(/[\\x00-\\x1F\\x7F]/g, '').trim().slice(0, 64);
    return v && new RegExp(${JSON.stringify(FROM_PATTERN.source)}).test(v) ? v : undefined;
  }

  function resolveEntryFrom() {
    try {
      var search = window.__SHOP_INITIAL_SEARCH__ || window.location.search;
      var urlFrom = new URLSearchParams(search).get('from');
      if (urlFrom) return clampFrom(urlFrom);
      var match = document.cookie.match(new RegExp('(?:^|; )' + ${JSON.stringify(KW_ATTR_COOKIE_NAME)} + '=([^;]*)'));
      if (!match) return undefined;
      var attr = JSON.parse(decodeURIComponent(match[1]));
      if (!attr || typeof attr.from_ts !== 'number' || !isFinite(attr.from_ts)) return undefined;
      var age = Date.now() - attr.from_ts;
      if (age < 0 || age >= ${ENTRY_FROM_WINDOW_MS}) return undefined;
      return clampFrom(attr.from);
    } catch (e) {
      return undefined;
    }
  }
})();
`;
}
