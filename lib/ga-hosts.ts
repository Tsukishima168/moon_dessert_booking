// GA4 host allowlist shared by the <head> bootstrap script (app/layout.tsx)
// and the gtag.js loader (components/GoogleAnalytics.tsx).
// R1 (UPGRADE_SPEC v1.1): kiwimu.com + subdomains + the 4 legacy production
// vercel.app aliases (real users, likely LINE LIFF entry). Blocks localhost,
// 127.0.0.1 and every other *.vercel.app preview.

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
    window.gtag('js', new Date());
    window.gtag('config', ${JSON.stringify(GA_ID)}, { page_path: window.location.pathname });
  }
})();
`;
}
