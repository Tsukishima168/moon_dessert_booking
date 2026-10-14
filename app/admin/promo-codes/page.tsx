'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Tag, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { PageHeader } from '@/components/shared/page-header'
import { SearchFilterBar } from '@/components/shared/search-filter-bar'
import { PromotionDialog } from '@/components/shared/promotion-dialog'
import { calculatePromoDiscount, formatPromoDiscount, fromTaipeiDateTimeLocal, toTaipeiDateTimeLocal } from '@/src/lib/promotion-config'
import type { PromoConfig } from '@/src/lib/promotion-config'
interface PromoCode extends PromoConfig { id: string; used_count: number }
const empty = (): Partial<PromoCode> => ({ code: '', description: '', discount_type: 'fixed', discount_value: 0, min_order_amount: 0, max_uses: null, valid_from: '', valid_until: null, is_active: true, member_only: false, per_member_limit: null })
export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<PromoCode>>(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sampleAmount, setSampleAmount] = useState(600)
  async function load() {
    try {
      const response = await fetch('/api/admin/promo-codes', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !Array.isArray(data)) throw new Error('目前無法載入優惠碼，請重新整理或確認後台登入。')
      setCodes(data)
    } catch (e) { setError(e instanceof Error ? e.message : '載入失敗。') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  function edit(code?: PromoCode) { setDraft(code ? { ...code } : empty()); setError(''); setEditing(true) }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saving) return; setSaving(true); setError('')
    try {
      const response = await fetch('/api/admin/promo-codes', { method: draft.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '儲存失敗，請稍後再試。')
      setEditing(false); await load()
    } catch (e) { setError(e instanceof Error ? e.message : '儲存失敗。') }
    finally { setSaving(false) }
  }
  async function remove(code: PromoCode) {
    if (!confirm(`刪除未使用的優惠碼「${code.code}」？此動作無法復原。`)) return
    try {
      const response = await fetch(`/api/admin/promo-codes?id=${encodeURIComponent(code.id)}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '刪除失敗。')
      await load()
    } catch (e) { setError((e as Error).message) }
  }
  const filtered = codes.filter(c => (!search || `${c.code} ${c.description ?? ''}`.toLowerCase().includes(search.toLowerCase())) && (filter === 'all' || (filter === 'active' ? c.is_active : !c.is_active)))
  let preview = '先填寫折扣，這裡會顯示試算。'
  try {
    const discount = calculatePromoDiscount(draft.discount_type ?? 'fixed', Number(draft.discount_value), sampleAmount)
    preview = sampleAmount < Number(draft.min_order_amount ?? 0) ? '這個金額尚未達到最低消費。' : `商品 NT$ ${sampleAmount.toLocaleString()}，折抵 NT$ ${discount.toLocaleString()}，折後 NT$ ${(sampleAmount - discount).toLocaleString()}。`
  } catch {}
  if (loading) return <LoadingState fullScreen text="載入優惠碼中…" className="bg-moon-black" />
  return <div className="space-y-6 p-4 sm:p-6">
    <PageHeader title="優惠碼管理" description="設定折扣、活動時間與使用限制。" icon={<Tag className="size-5" />} meta={`${filtered.length} 筆`} action={<button type="button" onClick={() => edit()} className="shop-primary min-h-11 gap-2 rounded-xl"><Plus size={18} />新增優惠碼</button>} />
    {!editing && error && <p role="alert" className="rounded-xl border border-red-300 p-4 text-sm">{error}</p>}
    <SearchFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="找優惠碼或活動說明" filters={[{ value: 'all', label: '全部' }, { value: 'active', label: '啟用中' }, { value: 'inactive', label: '已停用' }]} activeFilter={filter} onFilterChange={setFilter} />
    <p className="text-sm leading-relaxed text-moon-muted">使用量在訂單成立時占用，包含待付款訂單。它不是付款筆數；取消訂單不會自動恢復名額，需先核對。</p>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(code => <article key={code.id} className="rounded-xl border border-moon-border bg-moon-dark p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="break-all text-xl font-semibold">{code.code}</h2><span className="text-sm text-moon-muted">{code.is_active ? '啟用中' : '已停用'}</span></div>
      <p className="mt-2 text-sm text-moon-muted">{code.description || '未填活動說明'}</p>
      <p className="mt-4 text-lg text-moon-accent">{formatPromoDiscount(code.discount_type, code.discount_value)}</p>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-moon-muted">
        <p>商品最低消費 NT$ {code.min_order_amount.toLocaleString()}</p>
        <p>已占用 {code.used_count ?? 0} 次 ／ {code.max_uses == null ? '總量不限' : `總上限 ${code.max_uses} 次`}</p>
        <p>{code.member_only ? `會員限定${code.per_member_limit ? `，每人 ${code.per_member_limit} 次` : ''}` : '一般活動碼，不限會員'}</p>
        <p>{code.valid_until ? `截止：${toTaipeiDateTimeLocal(code.valid_until).replace('T', ' ')}（台灣時間）` : '沒有設定結束時間'}</p>
      </div>
      <button type="button" onClick={() => edit(code)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-moon-border px-4 text-sm"><Edit2 size={16} />編輯活動</button>
      {!Number(code.used_count) && <button type="button" onClick={() => remove(code)} aria-label={`刪除未使用優惠碼 ${code.code}`} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm text-moon-muted"><Trash2 size={16} />刪除未使用活動</button>}
    </article>)}</div>
    {!filtered.length && <EmptyState title="目前沒有符合的優惠碼" description="建立一個活動碼，設定折扣與期限，再確認前台顯示。" />}
    {editing && <PromotionDialog title={draft.id ? '編輯優惠碼' : '新增優惠碼'} description="時間以台灣時間設定；優惠只折抵商品金額，運費另計。" onClose={() => setEditing(false)} busy={saving}>
      <form onSubmit={save} className="promotion-form space-y-5">
        {error && <p role="alert" className="promotion-error">{error}</p>}
        <label>優惠代碼<input readOnly={!!draft.id} value={draft.code ?? ''} onChange={e => setDraft({ ...draft, code: e.target.value.toUpperCase() })} required minLength={3} maxLength={32} pattern="[A-Z0-9_-]+" autoComplete="off" /><small>{draft.id ? '已建立的代碼保留原名；新活動請另建優惠碼。' : '3–32 個英文字母、數字、底線或連字號。'}</small></label>
        <label>活動說明<input value={draft.description ?? ''} onChange={e => setDraft({ ...draft, description: e.target.value })} maxLength={500} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>折扣方式<select value={draft.discount_type} onChange={e => setDraft({ ...draft, discount_type: e.target.value as 'fixed' | 'percentage', discount_value: 0 })}><option value="fixed">定額折抵</option><option value="percentage">減少商品金額的百分比</option></select></label>
          <label>{draft.discount_type === 'percentage' ? '減少百分比（例如 12＝8.8 折）' : '折抵金額（元）'}<input type="number" required min={draft.discount_type === 'percentage' ? 0.01 : 1} max={draft.discount_type === 'percentage' ? 100 : 100000000} step={draft.discount_type === 'percentage' ? 0.01 : 1} value={draft.discount_value ?? ''} onChange={e => setDraft({ ...draft, discount_value: Number(e.target.value) })} /></label>
          <label>商品最低消費（元）<input type="number" min={0} step={1} max={100000000} value={draft.min_order_amount ?? 0} onChange={e => setDraft({ ...draft, min_order_amount: Number(e.target.value) })} /></label>
          <label>總使用上限<input type="number" min={Math.max(1, Number(draft.used_count ?? 0))} step={1} max={1000000} value={draft.max_uses ?? ''} onChange={e => setDraft({ ...draft, max_uses: e.target.value === '' ? null : Number(e.target.value) })} /><small>留空表示不限總次數。</small></label>
          <label>開始時間<input type="datetime-local" value={toTaipeiDateTimeLocal(draft.valid_from)} onChange={e => { try { setDraft({ ...draft, valid_from: fromTaipeiDateTimeLocal(e.target.value) ?? '' }) } catch (error) { setError((error as Error).message) } }} /><small>留空表示儲存後立即開始。</small></label>
          <label>結束時間<input type="datetime-local" value={toTaipeiDateTimeLocal(draft.valid_until)} onChange={e => { try { setDraft({ ...draft, valid_until: fromTaipeiDateTimeLocal(e.target.value) }) } catch (error) { setError((error as Error).message) } }} /><small>留空表示沒有期限。</small></label>
        </div>
        <label className="promotion-check"><input type="checkbox" checked={draft.member_only ?? false} onChange={e => setDraft({ ...draft, member_only: e.target.checked, per_member_limit: e.target.checked ? 1 : null })} />會員限定，使用時必須登入</label>
        {draft.member_only && <label>每位會員可用幾次<input type="number" min={1} step={1} max={1000000} value={draft.per_member_limit ?? ''} onChange={e => setDraft({ ...draft, per_member_limit: e.target.value === '' ? null : Number(e.target.value) })} /><small>預設一次；留空表示不限每人次數。</small></label>}
        <label className="promotion-check"><input type="checkbox" checked={draft.is_active ?? false} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />啟用此活動</label>
        <aside className="promotion-preview"><label>試算商品小計<input type="number" min={1} step={1} max={100000000} value={sampleAmount} onChange={e => setSampleAmount(Number(e.target.value))} /></label><p className="mt-3 text-sm" aria-live="polite">{preview}</p></aside>
        <div className="flex flex-wrap gap-3"><button type="button" className="promotion-secondary flex-1" onClick={() => setEditing(false)} disabled={saving}>取消</button><button type="submit" className="promotion-primary flex-1" disabled={saving}>{saving ? '儲存中…' : '儲存活動'}</button></div>
      </form>
    </PromotionDialog>}
  </div>
}
