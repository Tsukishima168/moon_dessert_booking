'use client';

import React, { useEffect, useId, useRef, useState } from 'react';

export type KiwimuUniverseSiteId = 'kiwimu' | 'shop' | 'passport' | 'gacha' | 'map';

interface KiwimuUniverseRailProps { currentSite: KiwimuUniverseSiteId; }
const UNIVERSE_SITES: ReadonlyArray<{ id: KiwimuUniverseSiteId; descriptor: string; href: string }> = [
  { id: 'kiwimu', descriptor: '人格測驗', href: 'https://kiwimu.com/' },
  { id: 'passport', descriptor: '會員護照', href: 'https://passport.kiwimu.com/' },
  { id: 'map', descriptor: '島嶼地圖', href: 'https://map.kiwimu.com/' },
  { id: 'gacha', descriptor: '遊戲中心', href: 'https://gacha.kiwimu.com/' },
  { id: 'shop', descriptor: '甜點預訂', href: 'https://shop.kiwimu.com/' },
];
const SECONDARY_SITES = new Set<KiwimuUniverseSiteId>(['map', 'gacha']);

export const KiwimuUniverseRail: React.FC<KiwimuUniverseRailProps> = ({ currentSite }) => {
  const railRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuHeight, setMenuHeight] = useState(0);
  const panelId = useId();

  const measureMenu = () => {
    const rail = railRef.current;
    if (rail) setMenuHeight(Math.max(0, Math.floor(window.innerHeight - Math.max(0, rail.getBoundingClientRect().bottom) - 16)));
  };
  const closeMenu = (restoreFocus = false) => {
    if (restoreFocus) moreRef.current?.focus();
    setMoreOpen(false);
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const root = document.documentElement;
    const previousHeight = root.style.getPropertyValue('--ku-rail-height');
    const measure = () => {
      // Fixed route headers also need the real height after text enlargement.
      root.style.setProperty('--ku-rail-height', `${rail.getBoundingClientRect().height}px`);
      measureMenu();
    };
    const resize = () => {
      measure();
      if (!window.matchMedia('(max-width: 640px)').matches) closeMenu();
    };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(rail);
    measure();
    window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      if (previousHeight) root.style.setProperty('--ku-rail-height', previousHeight);
      else root.style.removeProperty('--ku-rail-height');
    };
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
    };
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !railRef.current?.contains(event.target)) closeMenu();
    };
    const onBlur = () => closeMenu();
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', onBlur);
    window.addEventListener('scroll', measureMenu, { passive: true });
    document.addEventListener('pointerdown', onOutside, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('scroll', measureMenu);
      document.removeEventListener('pointerdown', onOutside, true);
    };
  }, [moreOpen]);

  const siteLink = (site: typeof UNIVERSE_SITES[number], inPanel = false) => {
    const isCurrent = site.id === currentSite;
    // Preserve the cross-site attribution contract and the current site's URL.
    const href = isCurrent ? site.href : `${site.href}?from=${currentSite}_universe_rail`;
    return <a key={site.id} href={href}
      className={`ku-universe-rail__link${isCurrent ? ' is-current' : ''}${!inPanel && SECONDARY_SITES.has(site.id) ? ' ku-universe-rail__secondary' : ''}`}
      aria-current={isCurrent ? 'page' : undefined}
      onClick={inPanel ? () => closeMenu(true) : undefined}>{site.descriptor}</a>;
  };
  const forestLink = (inPanel = false) => <a href="https://canopy.kiwimu.com/" target="_blank" rel="noopener noreferrer"
    aria-label="森林展覽：島嶼之上｜臺灣森林冠層（另開分頁）"
    className={`ku-universe-rail__link ku-universe-rail__showcase${inPanel ? '' : ' ku-universe-rail__secondary'}`}
    onClick={inPanel ? () => closeMenu(true) : undefined}>
      <span>森林展覽 <span aria-hidden="true">↗</span></span>
      {inPanel ? <span className="ku-universe-rail__hint">臺灣森林冠層・另開分頁</span> : null}
    </a>;

  return <aside ref={railRef} className="ku-universe-rail" data-current-site={currentSite}
    onBlurCapture={event => { const next = event.relatedTarget; if (!(next instanceof Node) || !railRef.current?.contains(next)) closeMenu(); }}>
    <div className="ku-universe-rail__inner">
      <div className="ku-universe-rail__identity" aria-label="Kiwimu Universe 五站與展覽導覽">
        <span className="ku-universe-rail__wordmark">Kiwimu Universe</span>
      </div>
      <nav className="ku-universe-rail__nav" aria-label="Kiwimu Universe 站點與展覽">
        {UNIVERSE_SITES.map(site => siteLink(site))}
        {forestLink()}
        <button ref={moreRef} type="button"
          className={`ku-universe-rail__more${SECONDARY_SITES.has(currentSite) ? ' is-current' : ''}`}
          aria-expanded={moreOpen} aria-controls={moreOpen ? panelId : undefined}
          onClick={() => { if (moreOpen) closeMenu(); else { measureMenu(); setMoreOpen(true); } }}>
          更多 <span aria-hidden="true">{moreOpen ? '−' : '＋'}</span>
        </button>
      </nav>
      {moreOpen ? <nav id={panelId} className="ku-universe-rail__more-panel" aria-label="更多站點與森林展覽" style={{ maxHeight: menuHeight }}>
        {UNIVERSE_SITES.filter(site => SECONDARY_SITES.has(site.id)).map(site => siteLink(site, true))}
        {forestLink(true)}
      </nav> : null}
    </div>
  </aside>;
};

export default KiwimuUniverseRail;
