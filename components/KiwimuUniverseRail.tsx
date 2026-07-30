'use client';

import React, { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export type KiwimuUniverseSiteId = 'kiwimu' | 'shop' | 'passport' | 'gacha' | 'map';
export type KiwimuUniverseLoginStatus = 'authenticated' | 'anonymous' | 'unknown';

export interface KiwimuUniverseNavigationDetails {
  [key: string]: string | number;
  source_site: KiwimuUniverseSiteId;
  target_site: KiwimuUniverseSiteId;
  viewport: string;
  viewport_width: number;
  viewport_height: number;
  viewport_category: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  login_status: KiwimuUniverseLoginStatus;
  surface: string;
  transport_type: 'beacon';
}

interface KiwimuUniverseRailProps {
  currentSite: KiwimuUniverseSiteId;
  authClient?: Pick<SupabaseClient, 'auth'> | null;
  onTrack?: (
    eventName: 'universe_nav_click',
    details: KiwimuUniverseNavigationDetails,
  ) => void;
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

export function createKiwimuUniverseNavigationDetails(
  sourceSite: KiwimuUniverseSiteId,
  targetSite: KiwimuUniverseSiteId,
  loginStatus: KiwimuUniverseLoginStatus,
  surface = 'universe_rail',
): KiwimuUniverseNavigationDetails {
  const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight;
  const viewportCategory = viewportWidth === 0
    ? 'unknown'
    : viewportWidth <= 640
      ? 'mobile'
      : viewportWidth <= 1024
        ? 'tablet'
        : 'desktop';

  return {
    source_site: sourceSite,
    target_site: targetSite,
    viewport: `${viewportWidth}x${viewportHeight}`,
    viewport_width: viewportWidth,
    viewport_height: viewportHeight,
    viewport_category: viewportCategory,
    login_status: loginStatus,
    surface,
    transport_type: 'beacon',
  };
}

export const KiwimuUniverseRail: React.FC<KiwimuUniverseRailProps> = ({
  currentSite,
  authClient,
  onTrack,
}) => {
  const navRef = useRef<HTMLElement>(null);
  const loginStatusRef = useRef<KiwimuUniverseLoginStatus>('unknown');

  useEffect(() => {
    if (!authClient) {
      loginStatusRef.current = 'unknown';
      return undefined;
    }

    let isActive = true;

    void authClient.auth.getSession()
      .then(({ data, error }) => {
        if (!isActive) return;
        loginStatusRef.current = error
          ? 'unknown'
          : data.session?.user
            ? 'authenticated'
            : 'anonymous';
      })
      .catch(() => {
        if (isActive) loginStatusRef.current = 'unknown';
      });

    const { data: { subscription } } = authClient.auth.onAuthStateChange((_event, session) => {
      loginStatusRef.current = session?.user ? 'authenticated' : 'anonymous';
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [authClient]);

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
                onClick={() => {
                  try {
                    onTrack?.(
                      'universe_nav_click',
                      createKiwimuUniverseNavigationDetails(
                        currentSite,
                        site.id,
                        loginStatusRef.current,
                      ),
                    );
                  } catch {
                    // Analytics must never block the cross-site navigation.
                  }
                }}
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
