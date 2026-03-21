'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Plus, Minus, Save, ArrowLeft, AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';

// ─── 型別 ──────────────────────────────────────────────────────────────────────

interface OrderItem {
  id?: string;
  name: string;
  variant_name?: string;
  price: number;
  quantity: number;
}

interface AdminOrder {
  order_id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  pickup_time: string;
  items: OrderItem[];
  total_price: number;
  original_price: number;
  final_price: number;
  discount_amount: number;
  promo_code: string | null;
  payment_method: string | null;
  delivery_method: string;
  delivery_fee: number;
  admin_notes: string | null;
  status: string;
  created_at: string;
}

interface FormState {
  pickup_time: string;
  items: OrderItem[];
  promo_code: string;
  discount_amount: number;
  status: string;
  admin_notes: string;
  payment_method: string;
}

// ─── 設定 ──────────────────────────────────────────────────────────────────────

const ORDER_STATUS = {
  pending:   '待付款',
  paid:      '已付款',
  ready:     '可取貨',
  completed: '完成',
  cancelled: '已取消',
} as const;

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash:     '現金',
  transfer: '轉帳',
  line_pay: 'LINE Pay',
};

// ─── 工具函式 ─────────────────────────────────────────────────────────────────

function calcPrices(items: OrderItem[], discountAmount: number, deliveryFee: number) {
  const original = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const final = Math.max(0, original - discountAmount + deliveryFee);
  return { original, final };
}

function toLocalDateTimeValue(s: string): string {
  // 將 "2025-03-10 14:00" 或 ISO 字串轉為 datetime-local input 值
  if (!s) return '';
  const normalized = s.includes('T') ? s.slice(0, 16) : s.replace(' ', 'T').slice(0, 16);
  return normalized;
}

// ─── 主元件 ──────────────────────────────────────────────────────────────────

export default function AdminOrderEditPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = (params?.orderId ?? '') as string;

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 表單狀態
  const [form, setForm] = useState<FormState>({
    pickup_time: '', items: [], promo_code: '',
    discount_amount: 0, status: 'pending',
    admin_notes: '', payment_method: '',
  });

  // 確認視窗
  const [showSummary, setShowSummary] = useState(false);       // 儲存前摘要
  const [showCancelConfirm, setShowCancelConfirm] = useState(false); // 轉帳取消確認

  // ─── 讀取訂單 ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetch(`/api/admin/orders/${orderId}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const o: AdminOrder = json.data;
          setOrder(o);
          setForm({
            pickup_time: toLocalDateTimeValue(o.pickup_time),
            items: (o.items || []).map(i => ({ ...i })),
            promo_code: o.promo_code || '',
            discount_amount: o.discount_amount ?? 0,
            status: o.status,
            admin_notes: o.admin_notes || '',
            payment_method: o.payment_method || '',
          });
        } else {
          setError('訂單不存在');
        }
      })
      .catch(() => setError('載入失敗'))
      .finally(() => setLoading(false));
  }, [orderId]);

  // ─── 金額計算 ────────────────────────────────────────────────────────────

  const deliveryFee = order?.delivery_fee ?? 0;
  const { original: computedOriginal, final: computedFinal } =
    calcPrices(form.items, form.discount_amount, deliveryFee);

  // ─── items 操作 ──────────────────────────────────────────────────────────

  const changeQty = (idx: number, delta: number) => {
    setForm(prev => {
      const items = prev.items.map((item, i) =>
        i === idx ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      ).filter(item => item.quantity > 0);
      return { ...prev, items };
    });
  };

  // ─── 儲存邏輯 ────────────────────────────────────────────────────────────

  // 點擊「儲存」時的前置檢查
  const handleSaveClick = () => {
    // 轉帳付款 → 取消：先跳特殊確認視窗
    if (
      form.status === 'cancelled' &&
      (form.payment_method === 'transfer' || order?.payment_method === 'transfer')
    ) {
      setShowCancelConfirm(true);
      return;
    }
    setShowSummary(true);
  };

  // 確認摘要後實際送出
  const handleConfirmSave = async () => {
    if (!order) return;
    setSaving(true);
    setShowSummary(false);
    setShowCancelConfirm(false);
    try {
      const pickup_time_value = form.pickup_time.replace('T', ' ');
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_time: pickup_time_value,
          items: form.items,
          discount_amount: form.discount_amount,
          status: form.status,
          admin_notes: form.admin_notes || null,
          payment_method: form.payment_method || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        router.push('/admin/orders');
      } else {
        setError(json.message || '儲存失敗');
      }
    } catch {
      setError('儲存失敗，請重試');
    } finally {
      setSaving(false);
    }
  };

  // ─── 變更摘要計算 ────────────────────────────────────────────────────────

  function buildChangeSummary(): string[] {
    if (!order) return [];
    const lines: string[] = [];

    const origPickup = toLocalDateTimeValue(order.pickup_time);
    if (form.pickup_time !== origPickup)
      lines.push(`取餐時間：${order.pickup_time} → ${form.pickup_time.replace('T', ' ')}`);

    if (form.status !== order.status)
      lines.push(`狀態：${ORDER_STATUS[order.status as keyof typeof ORDER_STATUS] ?? order.status} → ${ORDER_STATUS[form.status as keyof typeof ORDER_STATUS] ?? form.status}`);

    if (computedFinal !== (order.final_price ?? order.total_price))
      lines.push(`金額：$${order.final_price ?? order.total_price} → $${computedFinal}`);

    if (form.discount_amount !== (order.discount_amount ?? 0))
      lines.push(`折扣：$${order.discount_amount ?? 0} → $${form.discount_amount}`);

    if (form.promo_code !== (order.promo_code ?? ''))
      lines.push(`優惠碼：${order.promo_code || '（無）'} → ${form.promo_code || '（無）'}`);

    if (form.payment_method !== (order.payment_method ?? ''))
      lines.push(`付款方式：${PAYMENT_METHOD_LABEL[order.payment_method ?? ''] || '（未設定）'} → ${PAYMENT_METHOD_LABEL[form.payment_method] || '（未設定）'}`);

    const origItemsStr = JSON.stringify((order.items || []).map(i => `${i.name}×${i.quantity}`));
    const newItemsStr = JSON.stringify(form.items.map(i => `${i.name}×${i.quantity}`));
    if (origItemsStr !== newItemsStr)
      lines.push(`品項變更：${form.items.map(i => `${i.name}×${i.quantity}`).join(' / ') || '（已清空）'}`);

    if (form.admin_notes !== (order.admin_notes ?? ''))
      lines.push(`備註：已更新`);

    return lines;
  }

  // ─── 渲染 ────────────────────────────────────────────────────────────────

  if (loading) {
    return <LoadingState fullScreen text="載入訂單中..." className="bg-moon-black" />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-moon-black flex items-center justify-center px-4">
        <EmptyState
          title={error || '訂單不存在'}
          description="可以先返回訂單列表，再重新選擇一筆訂單。"
          className="w-full max-w-md border-moon-border bg-moon-dark/30"
          action={(
            <button onClick={() => router.push('/admin/orders')} className="text-moon-accent hover:underline text-sm">
              返回列表
            </button>
          )}
        />
      </div>
    );
  }

  const summaryLines = buildChangeSummary();

  return (
    <div className="min-h-screen bg-moon-black">
      {/* Header */}
      <header className="border-b border-moon-border bg-moon-dark sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => router.push('/admin/orders')} className="text-moon-muted hover:text-moon-text transition-colors">
              <ArrowLeft size={16} />
            </button>
            <PageHeader
              title={`訂單 ${order.order_id}`}
              description="調整取餐時間、品項、金額與後台備註。"
              meta="儲存前會先顯示變更摘要"
              className="flex-1"
            />
            <StatusBadge status={order.status} showIcon />
          </div>
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-moon-accent text-moon-black text-xs tracking-wider hover:bg-white transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            儲存
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* 客人資訊（唯讀） */}
        <section className="border border-moon-border bg-moon-dark/40 p-5 space-y-2">
          <h2 className="text-xs text-moon-muted tracking-widest mb-3">客人資訊</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-moon-muted mb-0.5">姓名</p>
              <p className="text-moon-text">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-[10px] text-moon-muted mb-0.5">電話</p>
              <p className="text-moon-text">{order.phone}</p>
            </div>
            {order.email && (
              <div className="col-span-2">
                <p className="text-[10px] text-moon-muted mb-0.5">Email</p>
                <p className="text-moon-text">{order.email}</p>
              </div>
            )}
          </div>
        </section>

        {/* 取餐時間 */}
        <section className="border border-moon-border bg-moon-dark/40 p-5">
          <h2 className="text-xs text-moon-muted tracking-widest mb-3">取餐時間</h2>
          <input
            type="datetime-local"
            value={form.pickup_time}
            onChange={e => setForm(p => ({ ...p, pickup_time: e.target.value }))}
            className="bg-moon-black border border-moon-border text-moon-text text-sm px-3 py-2 focus:outline-none focus:border-moon-accent transition-colors w-full sm:w-auto"
          />
        </section>

        {/* 商品項目 */}
        <section className="border border-moon-border bg-moon-dark/40 p-5">
          <h2 className="text-xs text-moon-muted tracking-widest mb-4">商品項目</h2>
          {form.items.length === 0 ? (
            <EmptyState
              title="目前沒有品項"
              description="這張訂單的品項已被調整為空。"
              className="border-moon-border/50 bg-moon-black/30"
            />
          ) : (
            <div className="space-y-3">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-moon-text text-sm truncate">
                      {item.name}
                      {item.variant_name && (
                        <span className="text-moon-muted text-xs ml-1">({item.variant_name})</span>
                      )}
                    </p>
                    <p className="text-[11px] text-moon-muted">${item.price} × {item.quantity} = ${item.price * item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => changeQty(idx, -1)}
                      className="w-7 h-7 flex items-center justify-center border border-moon-border text-moon-muted hover:border-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm text-moon-text">{item.quantity}</span>
                    <button
                      onClick={() => changeQty(idx, 1)}
                      className="w-7 h-7 flex items-center justify-center border border-moon-border text-moon-muted hover:border-green-400/60 hover:text-green-400 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 金額小計 */}
          <div className="border-t border-moon-border/50 mt-4 pt-3 space-y-1 text-xs">
            <div className="flex justify-between text-moon-muted">
              <span>小計</span>
              <span>${computedOriginal.toLocaleString()}</span>
            </div>
            {form.discount_amount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>折扣</span>
                <span>-${form.discount_amount.toLocaleString()}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-moon-muted">
                <span>運費</span>
                <span>+${deliveryFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium pt-1 border-t border-moon-border/30">
              <span className="text-moon-muted">合計</span>
              <span className="text-moon-accent">${computedFinal.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* 優惠碼 + 折扣 */}
        <section className="border border-moon-border bg-moon-dark/40 p-5 space-y-4">
          <h2 className="text-xs text-moon-muted tracking-widest">優惠碼 / 折扣</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-moon-muted block mb-1">優惠碼</label>
              <input
                type="text"
                value={form.promo_code || '未使用'}
                readOnly
                className="w-full bg-moon-black/70 border border-moon-border text-moon-muted text-sm px-3 py-2 font-mono cursor-not-allowed"
              />
              <p className="mt-1 text-[10px] text-moon-muted">
                優惠碼請由顧客結帳流程套用，後台僅顯示目前訂單紀錄。
              </p>
            </div>
            <div>
              <label className="text-[10px] text-moon-muted block mb-1">折扣金額（$）</label>
              <input
                type="number"
                min={0}
                value={form.discount_amount}
                onChange={e => setForm(p => ({ ...p, discount_amount: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="w-full bg-moon-black border border-moon-border text-moon-text text-sm px-3 py-2 focus:outline-none focus:border-moon-accent transition-colors"
              />
            </div>
          </div>
        </section>

        {/* 付款方式 + 狀態 */}
        <section className="border border-moon-border bg-moon-dark/40 p-5 space-y-4">
          <h2 className="text-xs text-moon-muted tracking-widest">訂單設定</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-moon-muted block mb-1">付款方式</label>
              <select
                value={form.payment_method}
                onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                className="w-full bg-moon-black border border-moon-border text-moon-text text-sm px-3 py-2 focus:outline-none focus:border-moon-accent transition-colors"
              >
                <option value="">未設定</option>
                <option value="cash">現金</option>
                <option value="transfer">轉帳</option>
                <option value="line_pay">LINE Pay</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-moon-muted block mb-1">訂單狀態</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-moon-black border border-moon-border text-moon-text text-sm px-3 py-2 focus:outline-none focus:border-moon-accent transition-colors"
              >
                {Object.entries(ORDER_STATUS).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 備註 */}
        <section className="border border-moon-border bg-moon-dark/40 p-5">
          <h2 className="text-xs text-moon-muted tracking-widest mb-3">後台備註（客人看不到）</h2>
          <textarea
            value={form.admin_notes}
            onChange={e => setForm(p => ({ ...p, admin_notes: e.target.value }))}
            placeholder="輸入內部備註..."
            rows={3}
            className="w-full bg-moon-black border border-moon-border text-moon-text text-sm px-3 py-2 focus:outline-none focus:border-moon-accent transition-colors resize-none placeholder:text-moon-muted/40"
          />
        </section>

        {error && (
          <p className="text-red-400 text-sm border border-red-400/30 px-4 py-3 bg-red-400/5">
            {error}
          </p>
        )}
      </main>

      {/* ── 儲存摘要確認對話框 ──────────────────────────────────── */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-moon-dark border border-moon-border w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm tracking-widest text-moon-text">確認變更</h3>
            {summaryLines.length === 0 ? (
              <p className="text-moon-muted text-sm">沒有任何變更</p>
            ) : (
              <ul className="space-y-1.5">
                {summaryLines.map((line, i) => (
                  <li key={i} className="text-sm text-moon-text flex gap-2">
                    <span className="text-moon-accent mt-0.5">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmSave}
                disabled={summaryLines.length === 0}
                className="flex-1 py-2 bg-moon-accent text-moon-black text-xs tracking-wider hover:bg-white transition-colors disabled:opacity-40"
              >
                確認儲存
              </button>
              <button
                onClick={() => setShowSummary(false)}
                className="flex-1 py-2 border border-moon-border text-moon-muted text-xs tracking-wider hover:border-moon-muted transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 轉帳取消確認對話框 ──────────────────────────────────── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-moon-dark border border-red-500/40 w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm text-red-300 tracking-wide mb-2">注意：轉帳付款訂單</h3>
                <p className="text-sm text-moon-muted leading-relaxed">
                  此訂單付款方式為<span className="text-moon-text font-medium">「轉帳」</span>，
                  請確認已通知客人退款後再取消。
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowCancelConfirm(false); setShowSummary(true); }}
                className="flex-1 py-2 bg-red-500 text-white text-xs tracking-wider hover:bg-red-400 transition-colors"
              >
                已通知客人，確認取消
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2 border border-moon-border text-moon-muted text-xs tracking-wider hover:border-moon-muted transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
