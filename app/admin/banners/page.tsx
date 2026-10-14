'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit, Eye, EyeOff, Trash2, Megaphone } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { SearchFilterBar } from '@/components/shared/search-filter-bar'
import { PageHeader } from '@/components/shared/page-header'
import { PromotionDialog } from '@/components/shared/promotion-dialog'
import { fromTaipeiDateTimeLocal, normalizeBannerConfig, toTaipeiDateTimeLocal } from '@/src/lib/promotion-config'
type Config = ReturnType<typeof normalizeBannerConfig>
interface Banner extends Config { id: string; view_count: number; click_count: number; updated_at: string }
const fresh = (): Config => ({ title: '', description: '', details: '', promo_code: null, image_url: '', link_url: '', link_text: '立即查看', background_color: '#1f3527', text_color: '#f5f0e8', is_active: false, priority: 100, display_type: 'announcement', start_date: null, end_date: null })
export default function BannersAdminPage() {
  const [rows, setRows] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Config & { id?: string }>(fresh)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  async function load() {
    try {
      const res = await fetch('/api/admin/banners', { cache: 'no-store' }); const data = await res.json()
      if (!res.ok || !Array.isArray(data)) throw new Error('目前無法載入公告，請重新整理或確認後台登入。')
      setRows(data)
    } catch (e) { setError(e instanceof Error ? e.message : '載入失敗。') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const edit = (row?: Banner) => { setDraft(row ? { ...row } : fresh()); setError(''); setMessage(''); setEditing(true) }
  async function request(method: string, data?: unknown, id?: string) {
    const res = await fetch(`/api/admin/banners${id ? `?id=${encodeURIComponent(id)}` : ''}`, { method, headers: { 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || '無法儲存，請稍後再試。')
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (saving) return; setSaving(true); setError('')
    try { const payload = normalizeBannerConfig(draft); await request(draft.id ? 'PUT' : 'POST', { ...payload, ...(draft.id ? { id: draft.id } : {}) }); setEditing(false); setMessage('公告已儲存，會依啟用狀態與排程顯示。'); await load() }
    catch (e) { setError(e instanceof Error ? e.message : '儲存失敗。') }
    finally { setSaving(false) }
  }
  async function toggle(row: Banner) {
    setError(''); try { await request('PUT', { id: row.id, is_active: !row.is_active }); await load() } catch (e) { setError((e as Error).message) }
  }
  async function remove(row: Banner) {
    if (!confirm(`刪除「${row.title}」及它的公告統計？此動作無法復原。`)) return
    try { await request('DELETE', undefined, row.id); await load() } catch (e) { setError((e as Error).message) }
  }
  const filtered = rows.filter(row => (!search || `${row.title} ${row.description ?? ''}`.toLowerCase().includes(search.toLowerCase())) && (filter === 'all' || (filter === 'active' ? row.is_active : !row.is_active)))
  if (loading) return <LoadingState fullScreen text="載入公告中…" className="bg-moon-black" />
  return <div className="space-y-6 p-4 sm:p-6">
    <PageHeader title="公告與活動" description="首頁公告、活動詳情與優惠碼，一次設定。" icon={<Megaphone className="size-5" />} action={<button type="button" onClick={() => edit()} className="shop-primary min-h-11 gap-2 rounded-xl"><Plus size={18} />新增公告</button>} />
    {!editing && error && <p role="alert" className="rounded-xl border border-red-300 p-4 text-sm">{error}</p>}
    {message && <p role="status" className="text-sm text-moon-muted">{message}</p>}
    <p className="text-sm leading-relaxed text-moon-muted">公告位於首頁介紹與商品目錄之間。多筆活動同時有效時，依優先順序顯示第一筆；客人關閉後會記住，內容更新後可再次顯示。</p>
    <SearchFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="找公告標題或說明" filters={[{ value: 'all', label: '全部' }, { value: 'active', label: '已啟用' }, { value: 'inactive', label: '已關閉' }]} activeFilter={filter} onFilterChange={setFilter} />
    <div className="grid gap-4 lg:grid-cols-2">{filtered.map(row => {
      const scheduled = !!row.start_date && new Date(row.start_date).getTime() > Date.now()
      const expired = !!row.end_date && new Date(row.end_date).getTime() < Date.now()
      const status = !row.is_active ? '已關閉' : expired ? '已結束' : scheduled ? '等待開始' : '符合顯示條件'
      return <article key={row.id} className="rounded-xl border border-moon-border bg-moon-dark p-5">
        <span className="text-sm text-moon-muted">{status} · {row.display_type === 'hero' ? '圖文橫幅' : '首頁公告條'}</span>
        <h2 className="mt-3 text-xl font-semibold">{row.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-moon-muted">{row.description}</p>
        <p className="mt-3 text-sm text-moon-muted">顯示順序 {row.priority}{row.end_date ? ` · 至 ${toTaipeiDateTimeLocal(row.end_date).replace('T', ' ')}（台灣時間）` : ' · 未設定結束時間'}</p>
        <p className="mt-3 text-sm">實際顯示 {row.view_count ?? 0} 次 · 互動 {row.click_count ?? 0} 次</p>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => edit(row)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-moon-border px-4"><Edit size={16} />編輯</button><button type="button" onClick={() => toggle(row)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-moon-border px-4">{row.is_active ? <EyeOff size={16} /> : <Eye size={16} />}{row.is_active ? '關閉公告' : '啟用公告'}</button><button type="button" onClick={() => remove(row)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-moon-border px-4" aria-label={`刪除公告 ${row.title}`}><Trash2 size={16} />刪除</button></div>
      </article>
    })}</div>
    {!filtered.length && <EmptyState title="目前沒有公告" description="先建立活動說明，確認預覽，再決定是否啟用。" />}
    <p className="text-sm leading-relaxed text-moon-muted">統計只記錄實際出現的公告；同一次顯示的重複互動只算一次。數字供活動觀察使用，不能視為訂單或付款數。</p>
    {editing && <PromotionDialog title={draft.id ? '編輯公告' : '新增公告'} description="先寫客人需要知道的內容，再設定顯示時間與連結。" onClose={() => setEditing(false)} busy={saving}>
      <form onSubmit={save} className="promotion-form space-y-5">
        {error && <p role="alert" className="promotion-error">{error}</p>}
        <label>公告標題<input required maxLength={120} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label>簡短說明<textarea rows={2} maxLength={500} value={draft.description ?? ''} onChange={e => setDraft({ ...draft, description: e.target.value })} /><small>首頁先顯示這段，建議寫一至兩句。</small></label>
        <label>活動詳情與使用規則<textarea rows={6} maxLength={8000} value={draft.details ?? ''} onChange={e => setDraft({ ...draft, details: e.target.value })} /><small>可寫活動日期、門檻、適用品項與使用方式。保留分行，前台會提供「查看活動詳情」。</small></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>優惠碼（選填）<input maxLength={32} value={draft.promo_code ?? ''} onChange={e => setDraft({ ...draft, promo_code: e.target.value.toUpperCase() || null })} /><small>請先到優惠碼管理建立同一個代碼。</small></label>
          <label>連結按鈕文字<input maxLength={40} value={draft.link_text} onChange={e => setDraft({ ...draft, link_text: e.target.value })} /></label>
        </div>
        <label>按鈕前往網址<input value={draft.link_url ?? ''} onChange={e => setDraft({ ...draft, link_url: e.target.value })} /><small>站內可填 /account?tab=offers 或 /#menu-section；外部請填完整 HTTPS 網址。</small></label>
        <label>圖片網址（圖文橫幅可用）<input value={draft.image_url ?? ''} onChange={e => setDraft({ ...draft, image_url: e.target.value })} /><small>使用既有 HTTPS 圖片網址，不會替你上傳新圖片。</small></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>顯示方式<select value={draft.display_type} onChange={e => setDraft({ ...draft, display_type: e.target.value })}><option value="announcement">首頁公告條</option><option value="hero">圖文橫幅</option></select></label>
          <label>顯示優先順序<input type="number" min={0} max={10000} step={1} value={draft.priority} onChange={e => setDraft({ ...draft, priority: Number(e.target.value) })} /><small>數字越大，越優先顯示。</small></label>
          <label>背景顏色<input type="color" value={draft.background_color} onChange={e => setDraft({ ...draft, background_color: e.target.value })} /></label>
          <label>文字顏色<input type="color" value={draft.text_color} onChange={e => setDraft({ ...draft, text_color: e.target.value })} /></label>
          <label>開始時間（台灣時間）<input type="datetime-local" value={toTaipeiDateTimeLocal(draft.start_date)} onChange={e => { try { setDraft({ ...draft, start_date: fromTaipeiDateTimeLocal(e.target.value) }) } catch (err) { setError((err as Error).message) } }} /><small>留空表示立即開始。</small></label>
          <label>結束時間（台灣時間）<input type="datetime-local" value={toTaipeiDateTimeLocal(draft.end_date)} onChange={e => { try { setDraft({ ...draft, end_date: fromTaipeiDateTimeLocal(e.target.value) }) } catch (err) { setError((err as Error).message) } }} /><small>留空表示持續顯示。</small></label>
        </div>
        <label className="promotion-check"><input type="checkbox" checked={draft.is_active} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />啟用公告（仍依排程顯示）</label>
        <aside className="rounded-xl p-5" style={{ backgroundColor: draft.background_color, color: draft.text_color }}><p className="mb-2 text-sm">首頁內容預覽</p><p className="text-lg font-semibold">{draft.title || '你的公告標題'}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{draft.description || '你的簡短活動說明'}</p><div className="mt-3 flex flex-wrap gap-3 text-sm">{draft.details && <span>查看活動詳情</span>}{draft.promo_code && <span>複製優惠碼 {draft.promo_code}</span>}{draft.link_url && <span>{draft.link_text || '立即查看'} →</span>}</div></aside>
        <div className="flex flex-wrap gap-3"><button type="button" className="promotion-secondary flex-1" disabled={saving} onClick={() => setEditing(false)}>取消</button><button type="submit" className="promotion-primary flex-1" disabled={saving}>{saving ? '儲存中…' : '儲存公告'}</button></div>
      </form>
    </PromotionDialog>}
  </div>
}
