'use client';

import { trackShopEvent } from '@/lib/shop-analytics';

export default function MemberPassportLink({ surface, className }: { surface: 'home' | 'order'; className?: string }) {
  const href = `https://passport.kiwimu.com/?screen=passport&tab=hub&from=shop_${surface}_passport`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}
      onClick={() => trackShopEvent('outbound_click', {
        target_site: 'passport', link_name: 'member_passport',
        entry_surface: `shop_${surface}`, destination_type: 'member_hub', transport_type: 'beacon',
      })}>
      回護照看今日任務 ↗
    </a>
  );
}
