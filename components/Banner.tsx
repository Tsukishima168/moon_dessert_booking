'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Copy, X } from 'lucide-react'
import { PromotionDialog } from '@/components/shared/promotion-dialog'
import { copyPromotionCode, readDismissedPromotions, saveDismissedPromotions } from '@/src/lib/promotion-browser'
interface BannerRow {
  id: string; title: string; description?: string | null; details?: string | null; promo_code?: string | null;
  image_url?: string | null; link_url?: string | null; link_text?: string | null;
  background_color: string; text_color: string; display_type: 'hero' | 'announcement'; updated_at?: string;
}
export default function Banner() {
  const [rows, setRows] = useState<BannerRow[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const impression = useRef<string | null>(null)
  const seen = useRef(false)
  const banner = rows.find(row => !dismissed.has(row.id) && !dismissed.has(`${row.id}:${row.updated_at ?? ''}`))
  useEffect(() => {
    setDismissed(readDismissedPromotions())
    const controller = new AbortController()
    void fetch('/api/banners', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (response.ok) { const data = await response.json(); setRows(Array.isArray(data) ? data : []) }
    }).catch(() => {})
    return () => controller.abort()
  }, [])
  const track = (action: 'view' | 'click') => {
    if (!banner || !impression.current) return
    void fetch('/api/banners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bannerId: banner.id, impressionId: impression.current, action }) }).catch(() => {})
  }
  useEffect(() => {
    if (!banner || !root.current) return
    impression.current = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null
    seen.current = false
    const view = () => { if (!seen.current) { seen.current = true; track('view') } }
    if (typeof IntersectionObserver !== 'function') { view(); return }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) view() }, { threshold: .25 })
    observer.observe(root.current)
    return () => observer.disconnect()
    // One impression per currently displayed announcement, not per fetched row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner?.id, banner?.updated_at])
  if (!banner) return null
  const dismiss = () => {
    const next = new Set(dismissed); next.add(`${banner.id}:${banner.updated_at ?? ''}`)
    setDismissed(next); saveDismissedPromotions(next); setDetailsOpen(false); setCopyMessage('')
  }
  const copy = async () => { track('click'); setCopyMessage(await copyPromotionCode(banner.promo_code!)) }
  return <>
    <div ref={root} className="relative rounded-2xl border border-moon-border p-5 pr-16 sm:p-6 sm:pr-16" style={{ backgroundColor: banner.background_color, color: banner.text_color }}>
      <button type="button" onClick={dismiss} className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-xl" aria-label="關閉這則公告"><X size={20} /></button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {banner.display_type === 'hero' && banner.image_url && <img src={banner.image_url} alt="" className="hidden size-24 shrink-0 rounded-xl object-cover sm:block" />}
        <div className="min-w-0 flex-1">
          <h3 className="wrap-break-word text-lg font-semibold leading-relaxed">{banner.title}</h3>
          {banner.description && <p className="mt-2 wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">{banner.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            {banner.details && <button type="button" onClick={() => { track('click'); setDetailsOpen(true) }} className="inline-flex min-h-11 items-center rounded-xl border border-current px-4">查看活動詳情</button>}
            {banner.promo_code && <button type="button" onClick={copy} className="inline-flex min-h-11 max-w-full flex-wrap items-center gap-2 rounded-xl border border-current px-4" aria-label={`複製優惠碼 ${banner.promo_code}`}><Copy size={16} /><span>複製優惠碼</span><code className="break-all">{banner.promo_code}</code></button>}
            {banner.link_url && <Link href={banner.link_url} onClick={() => track('click')} className="inline-flex min-h-11 max-w-full items-center rounded-xl px-3 py-2 underline underline-offset-4"><span className="min-w-0 break-all">{banner.link_text || '立即查看'} →</span></Link>}
          </div>
          {copyMessage && <p className="mt-3 text-sm" role="status">{copyMessage}</p>}
        </div>
      </div>
    </div>
    {detailsOpen && <PromotionDialog title={banner.title} description="活動條件與使用方式" onClose={() => setDetailsOpen(false)}>
      <p className="wrap-break-word whitespace-pre-wrap text-base leading-loose">{banner.details}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {banner.promo_code && <button type="button" className="promotion-primary max-w-full flex-wrap gap-2" onClick={copy}>複製優惠碼 <code className="break-all">{banner.promo_code}</code></button>}
        {banner.link_url && <Link href={banner.link_url} onClick={() => track('click')} className="promotion-secondary max-w-full"><span className="min-w-0 break-all">{banner.link_text || '立即查看'} →</span></Link>}
      </div>
      {copyMessage && <p role="status" className="mt-3 text-sm">{copyMessage}</p>}
    </PromotionDialog>}
  </>
}
