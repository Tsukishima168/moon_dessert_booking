'use client';

import type { ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';

/**
 * Reveal — 捲動浮現包裹（useInView + globals .reveal）
 * 進視窗一次後淡入上滑；prefers-reduced-motion 下直接顯示。
 */
export default function Reveal({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, isInView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${isInView ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}
