'use client';

import React, { useEffect, useId, useRef, useState } from 'react';

/*
 * Kiwimu Universe rail — shared kit. This file is byte-identical across the five sites.
 * Never edit a site's copy: change the kit, re-copy it, and re-run `node verify-rail.mjs <repo>`.
 * Site differences go through props (below) and the site's own CSS (see INTEGRATION.md).
 * Depends on `react` only.
 */

export type KiwimuUniverseSiteId = 'kiwimu' | 'shop' | 'passport' | 'gacha' | 'map';
/** A rail link target: one of the five sites, or the forest exhibition. */
export type KiwimuUniverseTargetId = KiwimuUniverseSiteId | 'canopy';
export type KiwimuUniverseLoginStatus = 'authenticated' | 'anonymous' | 'unknown';
export type KiwimuUniverseEventName = 'universe_nav_click';

export interface KiwimuUniverseNavigationDetails {
  [key: string]: string | number;
  source_site: KiwimuUniverseSiteId;
  target_site: KiwimuUniverseTargetId;
  viewport: string;
  viewport_width: number;
  viewport_height: number;
  viewport_category: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  login_status: KiwimuUniverseLoginStatus;
  surface: string;
  // Canonical event params shared across the five-site outbound contract. Kept
  // next to `surface`/`target_site` so existing universe_nav_click history stays comparable.
  link_name: string;
  entry_surface: string;
  destination_type: string;
  transport_type: 'beacon';
}

export interface KiwimuUniverseRailProps {
  currentSite: KiwimuUniverseSiteId;
  /**
   * Value of the `from` attribution param on cross-site links. Must match /^[a-z0-9_]+$/,
   * otherwise the default is used. Default: `${currentSite}_universe_rail`.
   */
  fromParam?: string;
  /** Also add `?from=` to the link that points at the current site. Default false (kiwimu passes true). */
  tagCurrentSite?: boolean;
  /** Called on every rail link click (including the forest exhibition). Errors are swallowed. */
  onTrack?: (eventName: KiwimuUniverseEventName, details: KiwimuUniverseNavigationDetails) => void;
  /** Read once when the rail mounts and cached. Default: always 'unknown'. */
  getLoginStatus?: () => KiwimuUniverseLoginStatus | Promise<KiwimuUniverseLoginStatus>;
}

/** Structural subset of a Supabase client, so the kit imports no Supabase package. */
export interface KiwimuUniverseSessionClient {
  auth: {
    getSession: () => PromiseLike<{ data: { session: { user?: unknown } | null }; error?: unknown }>;
  };
}

const UNIVERSE_SITES: ReadonlyArray<{
  id: KiwimuUniverseSiteId;
  label: string;
  descriptor: string;
  origin: string;
}> = [
  { id: 'kiwimu', label: 'MBTI', descriptor: '人格測驗', origin: 'https://kiwimu.com/' },
  { id: 'passport', label: 'Passport', descriptor: '會員護照', origin: 'https://passport.kiwimu.com/' },
  { id: 'map', label: 'Map', descriptor: '島嶼地圖', origin: 'https://map.kiwimu.com/' },
  { id: 'gacha', label: 'Gacha', descriptor: '遊戲中心', origin: 'https://gacha.kiwimu.com/' },
  { id: 'shop', label: 'Shop', descriptor: '甜點預訂', origin: 'https://shop.kiwimu.com/' },
];

const MOBILE_MORE_SITES = new Set<KiwimuUniverseSiteId>(['map', 'gacha']);
const FOREST_EXHIBITION_URL = 'https://canopy.kiwimu.com/';
const FOREST_EXHIBITION_LABEL = '森林展覽：島嶼之上｜臺灣森林冠層（另開分頁）';
const FROM_PARAM_PATTERN = /^[a-z0-9_]+$/;
const DEFAULT_SURFACE = 'universe_rail';

/**
 * The href a rail link renders. Cross-site links carry `?from=<fromParam>`; the link to the
 * current site stays bare unless `tagCurrentSite` is set; the forest exhibition never carries `from`.
 */
export function buildUniverseHref(
  targetSite: KiwimuUniverseTargetId,
  currentSite: KiwimuUniverseSiteId,
  options: Pick<KiwimuUniverseRailProps, 'fromParam' | 'tagCurrentSite'> = {},
): string {
  if (targetSite === 'canopy') return FOREST_EXHIBITION_URL;
  const site = UNIVERSE_SITES.find((entry) => entry.id === targetSite);
  if (!site) return FOREST_EXHIBITION_URL;
  if (targetSite === currentSite && !options.tagCurrentSite) return site.origin;
  const from = options.fromParam && FROM_PARAM_PATTERN.test(options.fromParam)
    ? options.fromParam
    : `${currentSite}_universe_rail`;
  return `${site.origin}?from=${from}`;
}

export function createKiwimuUniverseNavigationDetails(
  sourceSite: KiwimuUniverseSiteId,
  targetSite: KiwimuUniverseTargetId,
  loginStatus: KiwimuUniverseLoginStatus,
  surface = DEFAULT_SURFACE,
): KiwimuUniverseNavigationDetails {
  const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight;
  const viewportCategory = !viewportWidth
    ? 'unknown'
    : viewportWidth <= 640
      ? 'mobile'
      : viewportWidth <= 1024
        ? 'tablet'
        : 'desktop';
  const targetMeta = UNIVERSE_SITES.find((site) => site.id === targetSite);

  return {
    source_site: sourceSite,
    target_site: targetSite,
    viewport: `${viewportWidth}x${viewportHeight}`,
    viewport_width: viewportWidth,
    viewport_height: viewportHeight,
    viewport_category: viewportCategory,
    login_status: loginStatus,
    surface,
    link_name: targetMeta ? targetMeta.label : 'Canopy',
    entry_surface: surface,
    destination_type: targetSite === 'canopy' ? 'external' : 'cross_site_nav',
    transport_type: 'beacon',
  };
}

/** Maps a Supabase-shaped client to a login status. Never throws; no client means 'unknown'. */
export async function readSupabaseLoginStatus(
  client: KiwimuUniverseSessionClient | null | undefined,
): Promise<KiwimuUniverseLoginStatus> {
  if (!client) return 'unknown';
  try {
    const { data, error } = await client.auth.getSession();
    if (error) return 'unknown';
    return data.session && data.session.user ? 'authenticated' : 'anonymous';
  } catch {
    return 'unknown';
  }
}

const isLoginStatus = (value: unknown): value is KiwimuUniverseLoginStatus =>
  value === 'authenticated' || value === 'anonymous' || value === 'unknown';

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';

export const KiwimuUniverseRail: React.FC<KiwimuUniverseRailProps> = ({
  currentSite,
  fromParam,
  tagCurrentSite = false,
  onTrack,
  getLoginStatus,
}) => {
  const railRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuHeight, setMenuHeight] = useState(0);
  const panelId = useId();
  const loginStatusRef = useRef<KiwimuUniverseLoginStatus>('unknown');
  const mountLoginReaderRef = useRef(getLoginStatus); // the adapter as of the first render: read once, never re-read
  const hrefOptions = { fromParam, tagCurrentSite };

  const trackNavigation = (targetSite: KiwimuUniverseTargetId) => {
    if (!onTrack) return;
    try {
      const result: unknown = onTrack(
        'universe_nav_click',
        createKiwimuUniverseNavigationDetails(currentSite, targetSite, loginStatusRef.current),
      );
      // An async onTrack must not surface an unhandled rejection either.
      if (isThenable(result)) result.then(undefined, () => {});
    } catch {
      // Analytics must never block the cross-site navigation. Never preventDefault here.
    }
  };

  // Login status: read once on mount, cached for every later click.
  useEffect(() => {
    const readLoginStatus = mountLoginReaderRef.current;
    if (!readLoginStatus) {
      loginStatusRef.current = 'unknown';
      return undefined;
    }
    let isActive = true;
    const settle = (value: unknown) => {
      if (isActive) loginStatusRef.current = isLoginStatus(value) ? value : 'unknown';
    };
    try {
      Promise.resolve(readLoginStatus()).then(settle, () => settle('unknown'));
    } catch {
      settle('unknown');
    }
    return () => {
      isActive = false;
    };
  }, []);

  const measureMenu = () => {
    const rail = railRef.current;
    if (rail) {
      setMenuHeight(Math.max(0, Math.floor(window.innerHeight - Math.max(0, rail.getBoundingClientRect().bottom) - 16)));
    }
  };
  const closeMenu = (restoreFocus = false) => {
    if (restoreFocus) moreRef.current?.focus();
    setMoreOpen(false);
  };

  // Publish the real rail height (safe area and text enlargement included) for fixed headers.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const root = document.documentElement;
    const previousHeight = root.style.getPropertyValue('--ku-rail-height');
    const measure = () => {
      root.style.setProperty('--ku-rail-height', `${rail.getBoundingClientRect().height}px`);
      measureMenu();
    };
    const resize = () => {
      measure();
      if (!window.matchMedia('(max-width: 640px)').matches) closeMenu();
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(rail, { box: 'border-box' }); // padding (safe area) changes must re-measure too
    measure();
    window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      if (previousHeight) root.style.setProperty('--ku-rail-height', previousHeight);
      else root.style.removeProperty('--ku-rail-height');
    };
  }, []);

  // Listeners exist only while the menu is open, so Esc is swallowed only then.
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        closeMenu(true);
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !railRef.current?.contains(event.target)) closeMenu();
    };
    const onBlur = () => closeMenu();
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('scroll', measureMenu, { passive: true });
    document.addEventListener('pointerdown', onOutside, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('scroll', measureMenu);
      document.removeEventListener('pointerdown', onOutside, true);
    };
  }, [moreOpen]);

  const siteLink = (site: typeof UNIVERSE_SITES[number], inPanel = false) => {
    const isCurrent = site.id === currentSite;
    return <a key={site.id} href={buildUniverseHref(site.id, currentSite, hrefOptions)}
      className={`ku-universe-rail__link${isCurrent ? ' is-current' : ''}${!inPanel && MOBILE_MORE_SITES.has(site.id) ? ' ku-universe-rail__secondary' : ''}`}
      aria-current={isCurrent ? 'page' : undefined}
      onClick={() => { trackNavigation(site.id); if (inPanel) closeMenu(true); }}>{site.descriptor}</a>;
  };
  const forestLink = (inPanel = false) => <a href={buildUniverseHref('canopy', currentSite, hrefOptions)}
    target="_blank" rel="noopener noreferrer"
    aria-label={FOREST_EXHIBITION_LABEL}
    className={`ku-universe-rail__link ku-universe-rail__showcase${inPanel ? '' : ' ku-universe-rail__secondary'}`}
    onClick={() => { trackNavigation('canopy'); if (inPanel) closeMenu(true); }}>
      <span>森林展覽 <span aria-hidden="true">↗</span></span>
      {inPanel ? <span className="ku-universe-rail__hint">臺灣森林冠層・另開分頁</span> : null}
    </a>;

  // On phones map and gacha live inside "更多": the button names the current site so the
  // visitor still knows where they are.
  const currentMeta = UNIVERSE_SITES.find((site) => site.id === currentSite);
  const moreHoldsCurrent = MOBILE_MORE_SITES.has(currentSite) && Boolean(currentMeta);

  return <aside ref={railRef} className={`ku-universe-rail${moreOpen ? ' is-menu-open' : ''}`} data-current-site={currentSite}
    onBlurCapture={event => { const next = event.relatedTarget; if (!(next instanceof Node) || !railRef.current?.contains(next)) closeMenu(); }}>
    <div className="ku-universe-rail__inner">
      <div className="ku-universe-rail__identity" aria-label="Kiwimu Universe 五站與展覽導覽">
        <span className="ku-universe-rail__wordmark">Kiwimu Universe</span>
      </div>
      <nav className={`ku-universe-rail__nav${moreHoldsCurrent ? ' ku-universe-rail__nav--more-current' : ''}`} aria-label="Kiwimu Universe 站點與展覽">
        {UNIVERSE_SITES.map(site => siteLink(site))}
        {forestLink()}
        <button ref={moreRef} type="button"
          className={`ku-universe-rail__more${moreHoldsCurrent ? ' is-current' : ''}`}
          aria-label={moreHoldsCurrent && currentMeta ? `更多站點，目前在${currentMeta.descriptor}` : undefined}
          aria-expanded={moreOpen} aria-controls={moreOpen ? panelId : undefined}
          onClick={() => { if (moreOpen) closeMenu(); else { measureMenu(); setMoreOpen(true); } }}>
          {moreHoldsCurrent && currentMeta ? currentMeta.descriptor : '更多'} <span aria-hidden="true">{moreOpen ? '−' : '＋'}</span>
        </button>
      </nav>
      {moreOpen ? <nav id={panelId} className="ku-universe-rail__more-panel" aria-label="更多站點與森林展覽" style={{ maxHeight: menuHeight }}>
        {UNIVERSE_SITES.filter(site => MOBILE_MORE_SITES.has(site.id)).map(site => siteLink(site, true))}
        {forestLink(true)}
      </nav> : null}
    </div>
  </aside>;
};

export default KiwimuUniverseRail;
