'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, RefreshCw } from 'lucide-react'
import { copyPromotionCode } from '@/src/lib/promotion-browser'
import { toTaipeiDateTimeLocal } from '@/src/lib/promotion-config'
interface Offer {
  id: string; code: string; description: string | null; discount_label: string; min_order_amount: number;
  valid_until: string | null; used_count: number; per_member_limit: number | null; available: boolean; message: string;
}
export function MemberOffers() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setCopyMessage('')
    void fetch('/api/user/offers', { cache: 'no-store', signal: controller.signal }).then(async res => {
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) throw new Error(data.error || '目前無法載入優惠。')
      setOffers(data)
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '載入失敗，請稍後再試。') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [version])
  if (loading) return <p role="status" className="p-5 text-moon-muted">正在確認會員優惠…</p>
  return <section className="space-y-4">
    <div><h2 className="text-xl font-semibold text-moon-text">我的優惠</h2><p className="mt-2 text-sm leading-relaxed text-moon-muted">複製活動碼後，在 Shop 結帳時貼上。折扣以結帳時驗證結果為準，商品低消不包含運費。</p></div>
    {error && <div role="alert" className="rounded-xl border border-moon-border p-5"><p>{error}</p><button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-moon-border px-4" onClick={() => setVersion(v => v + 1)}><RefreshCw size={16} />重新載入優惠</button></div>}
    {!error && offers.length === 0 && <div className="rounded-xl border border-moon-border p-6"><p>目前沒有會員限定活動。</p><p className="mt-2 text-sm text-moon-muted">有新活動時會在這裡顯示，你也可以先逛逛甜點。</p><Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-moon-border px-4 text-sm">選購甜點 →</Link></div>}
    {!error && <div className="grid gap-4 md:grid-cols-2">{offers.map(offer => <article key={offer.id} className="rounded-xl border border-moon-border bg-moon-black p-5">
      <h3 className="text-lg font-semibold text-moon-accent">{offer.discount_label}</h3><p className="mt-2 text-sm text-moon-muted">{offer.description || '會員限定活動'}</p>
      <p className="mt-3 text-sm">商品滿 NT$ {offer.min_order_amount.toLocaleString()} 可用</p>
      <p className="mt-2 text-sm text-moon-muted">{offer.valid_until ? `至 ${toTaipeiDateTimeLocal(offer.valid_until).replace('T', ' ')}（台灣時間）` : '活動沒有設定截止時間'}</p>
      <p className="mt-2 text-sm text-moon-muted">已占用 {offer.used_count} 次{offer.per_member_limit ? `，每人上限 ${offer.per_member_limit} 次` : ''}</p>
      <p className="mt-3 text-sm leading-relaxed">{offer.message}</p>
      {offer.available && <button type="button" onClick={async () => setCopyMessage(await copyPromotionCode(offer.code))} className="mt-4 inline-flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-moon-border px-4" aria-label={`複製優惠碼 ${offer.code}`}><Copy size={16} />複製優惠碼 <code className="break-all">{offer.code}</code></button>}
    </article>)}</div>}
    {copyMessage && <p role="status" className="text-sm text-moon-muted">{copyMessage}</p>}
    <p className="text-sm leading-relaxed text-moon-muted">一筆成立訂單會占用一次名額，包含待付款訂單。取消後是否恢復優惠，請先透過官方 LINE 確認。</p>
  </section>
}
