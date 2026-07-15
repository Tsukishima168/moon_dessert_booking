'use client';

import React, { useEffect, useRef } from 'react';

export type KiwimuUniverseSiteId = 'kiwimu' | 'shop' | 'passport' | 'gacha' | 'map';

interface KiwimuUniverseRailProps {
  currentSite: KiwimuUniverseSiteId;
}

const UNIVERSE_SITES: ReadonlyArray<{
  id: KiwimuUniverseSiteId;
  label: string;
  descriptor: string;
  href: string;
}> = [
  { id: 'kiwimu', label: 'MBTI', descriptor: '人格測驗', href: 'https://kiwimu.com/' },
  { id: 'passport', label: 'Passport', descriptor: '會員護照', href: 'https://passport.kiwimu.com/' },
  { id: 'map', label: 'Map', descriptor: '島嶼地圖', href: 'https://map.kiwimu.com/' },
  { id: 'gacha', label: 'Gacha', descriptor: '遊戲中心', href: 'https://gacha.kiwimu.com/' },
  { id: 'shop', label: 'Shop', descriptor: '甜點預訂', href: 'https://shop.kiwimu.com/' },
];

export const KiwimuUniverseRail: React.FC<KiwimuUniverseRailProps> = ({ currentSite }) => {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const centerCurrentSite = () => {
      const nav = navRef.current;

      if (!nav || !window.matchMedia('(max-width: 640px)').matches) return;

      const currentLink = nav.querySelector<HTMLElement>('[aria-current="page"]');

      if (!currentLink) return;

      nav.scrollLeft = Math.max(
        0,
        currentLink.offsetLeft - (nav.clientWidth - currentLink.clientWidth) / 2,
      );
    };

    const animationFrame = window.requestAnimationFrame(centerCurrentSite);
    window.addEventListener('resize', centerCurrentSite);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', centerCurrentSite);
    };
  }, [currentSite]);

  return (
    <aside className="ku-universe-rail" data-current-site={currentSite}>
      <div className="ku-universe-rail__inner">
        <div className="ku-universe-rail__identity" aria-label="Kiwimu Universe 五站導覽">
          <span className="ku-universe-rail__orbit" aria-hidden="true">
            {UNIVERSE_SITES.map((site) => (
              <span
                key={site.id}
                className={site.id === currentSite ? 'is-current' : undefined}
              />
            ))}
          </span>
          <span className="ku-universe-rail__wordmark">Kiwimu Universe</span>
          <span className="ku-universe-rail__meta">05 connected sites</span>
        </div>

        <nav ref={navRef} className="ku-universe-rail__nav" aria-label="Kiwimu Universe 站點">
          {UNIVERSE_SITES.map((site, index) => {
            const isCurrent = site.id === currentSite;

            return (
              <a
                key={site.id}
                href={site.href}
                className={`ku-universe-rail__link${isCurrent ? ' is-current' : ''}`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                <span className="ku-universe-rail__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="ku-universe-rail__label">{site.label}</span>
                <span className="ku-universe-rail__descriptor">{site.descriptor}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default KiwimuUniverseRail;
