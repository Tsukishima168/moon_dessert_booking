'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Plus, Minus, Save, ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Mail, BellRing, Workflow, Clock3 } from 'lucide-react';

// ─── 型別 ──────────────────────────────────────────────────────────────────────

interface OrderItem {
  id?: string;
  name: string;
  variant_name?: string;
  price: number;
  quantity: number;
}

interface NotificationLogEntry {
  id: string;
  order_id: string;
  event_type: string;
  trigger_mode: 'status_change' | 'manual_retry';
  requested_channel: 'all' | 'email' | 'discord' | 'n8n';
  previous_status: string | null;
  current_status: string;
  email_state: SaveNotificationChannelResult['state'];
  email_message: string;
  discord_state: SaveNotificationChannelResult['state'];
  discord_message: string;
  n8n_state: SaveNotificationChannelResult['state'];
  n8n_message: string;
  created_at: string;
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
  linepay_transaction_id: string | null;
  delivery_method: string;
  delivery_fee: number;
  admin_notes: string | null;
  status: string;
  created_at: string;
  notification_logs?: NotificationLogEntry[];
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

interface NotificationChannelStatus {
  isConfigured: boolean;
  message: string;
  mode?: string;
  host?: string | null;
}

interface NotificationStatusData {
  resend: NotificationChannelStatus;
  discord: NotificationChannelStatus;
  n8n: NotificationChannelStatus;
}

interface SaveNotificationChannelResult {
  state: 'sent' | 'failed' | 'skipped' | 'queued';
  message: string;
}

interface SaveNotificationResult {
  triggerMode: 'status_change' | 'manual_retry';
  requestedChannel: 'all' | 'email' | 'discord' | 'n8n';
  statusChanged: boolean;
  previousStatus: string;
  currentStatus: string;
  channels: {
    discord: SaveNotificationChannelResult;
    email: SaveNotificationChannelResult;
    n8n: SaveNotificationChannelResult;
  };
}

// ─── 設定 ──────────────────────────────────────────────────────────────────────

const ORDER_STATUS = {
  pending:   '待付款',
  paid:      '已付款',
  ready:     '可取貨',
  completed: '完成',
  cancelled: '已取消',
} as const;

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending:   'text-yellow-400 bg-yellow-400/10',
  paid:      'text-blue-400 bg-blue-400/10',
  ready:     'text-green-400 bg-green-400/10',
  completed: 'text-moon-muted bg-moon-muted/10',
  cancelled: 'text-red-400 bg-red-400/10',
};

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

function buildFormStateFromOrder(order: AdminOrder): FormState {
  return {
    pickup_time: toLocalDateTimeValue(order.pickup_time),
    items: (order.items || []).map(i => ({ ...i })),
    promo_code: order.promo_code || '',
    discount_amount: order.discount_amount ?? 0,
    status: order.status,
    admin_notes: order.admin_notes || '',
    payment_method: order.payment_method || '',
  };
}

async function fetchAdminOrder(orderId: string): Promise<AdminOrder> {
  const response = await fetch(`/api/admin/orders/${orderId}`);
  const json = await response.json();

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || '載入失敗');
  }

  return json.data as AdminOrder;
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
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatusData | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [lastSaveResult, setLastSaveResult] = useState<SaveNotificationResult | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [retryingTarget, setRetryingTarget] = useState<SaveNotificationResult['requestedChannel'] | null>(null);

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
    fetchAdminOrder(orderId)
      .then((nextOrder) => {
        setOrder(nextOrder);
        setForm(buildFormStateFromOrder(nextOrder));
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : '載入失敗');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    setNotificationLoading(true);
    fetch('/api/admin/notifications/status')
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setNotificationStatus(json.data);
        }
      })
      .catch(() => {
        setNotificationStatus(null);
      })
      .finally(() => setNotificationLoading(false));
  }, []);

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
    setError(null);
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
          original_price: computedOriginal,
          final_price: computedFinal,
          total_price: computedFinal,
          discount_amount: form.discount_amount,
          promo_code: form.promo_code || null,
          status: form.status,
          admin_notes: form.admin_notes || null,
          payment_method: form.payment_method || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const nextOrder = json.data as AdminOrder;
        setOrder(nextOrder);
        setForm(buildFormStateFromOrder(nextOrder));
        setLastSaveResult((json.notification_result ?? null) as SaveNotificationResult | null);
        setLastSavedAt(new Date().toISOString());
        void fetchAdminOrder(orderId)
          .then((refreshedOrder) => {
            setOrder(refreshedOrder);
            setForm(buildFormStateFromOrder(refreshedOrder));
          })
          .catch(() => { });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(json.message || '儲存失敗');
      }
    } catch {
      setError('儲存失敗，請重試');
    } finally {
      setSaving(false);
    }
  };

  const handleResendNotifications = async (
    target: SaveNotificationResult['requestedChannel']
  ) => {
    if (!order) return;
    setRetryingTarget(target);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/notifications/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const json = await res.json();

      if (json.success) {
        setLastSaveResult((json.notification_result ?? null) as SaveNotificationResult | null);
        setLastSavedAt(new Date().toISOString());
        void fetchAdminOrder(orderId)
          .then((refreshedOrder) => {
            setOrder(refreshedOrder);
            setForm(buildFormStateFromOrder(refreshedOrder));
          })
          .catch(() => { });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(json.message || '重送通知失敗');
      }
    } catch {
      setError('重送通知失敗，請重試');
    } finally {
      setRetryingTarget(null);
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

  if (loading) return (
    <div className="min-h-screen bg-moon-black flex items-center justify-center">
      <Loader2 className="animate-spin text-moon-accent" size={32} />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-moon-black flex flex-col items-center justify-center gap-4">
      <p className="text-red-400">{error || '訂單不存在'}</p>
      <button onClick={() => router.push('/admin/orders')} className="text-moon-muted hover:text-moon-text text-sm">
        ← 返回列表
      </button>
    </div>
  );

  const statusColorClass = ORDER_STATUS_COLOR[order.status] ?? 'text-moon-muted bg-moon-muted/10';
  const summaryLines = buildChangeSummary();
  const willChangeStatus = form.status !== order.status;
  const willTriggerCustomerEmail =
    willChangeStatus &&
    ['ready', 'cancelled'].includes(form.status) &&
    !!order.email;
  const willTriggerOpsNotifications = willChangeStatus;
  const saveResultStateStyles: Record<SaveNotificationChannelResult['state'], string> = {
    sent: 'text-green-400 bg-green-400/10 border-green-400/20',
    failed: 'text-red-400 bg-red-400/10 border-red-400/20',
    skipped: 'text-moon-muted bg-moon-border/10 border-moon-border/30',
    queued: 'text-yellow-300 bg-yellow-300/10 border-yellow-300/20',
  };
  const saveResultStateLabel: Record<SaveNotificationChannelResult['state'], string> = {
    sent: '已送出',
    failed: '失敗',
    skipped: '略過',
    queued: '同步中',
  };
  const retryTargetLabel: Record<SaveNotificationResult['requestedChannel'], string> = {
    all: '全部通知',
    email: 'Email',
    discord: 'Discord',
    n8n: 'n8n',
  };
  const triggerModeLabel: Record<SaveNotificationResult['triggerMode'], string> = {
    status_change: '狀態變更',
    manual_retry: '手動重送',
  };

  const StatusIndicator = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
    ) : (
      <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
    );

  return (
    <div className="min-h-screen bg-moon-black">
      {/* Header */}
      <header className="border-b border-moon-border bg-moon-dark sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/orders')} className="text-moon-muted hover:text-moon-text transition-colors">
              <ArrowLeft size={16} />
            </button>
            <span className="font-mono text-moon-accent text-sm">{order.order_id}</span>
            <span className={`px-2 py-0.5 text-[10px] ${statusColorClass}`}>
              {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS] ?? order.status}
            </span>
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
        {lastSaveResult && (
          <section className="border border-green-400/30 bg-green-400/5 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs tracking-widest text-green-300">最近一次通知結果</p>
                <p className="text-sm text-moon-text">
                  {lastSaveResult.triggerMode === 'manual_retry'
                    ? (
                      <>
                        已手動重送
                        <span className="text-green-300 ml-1">
                          {retryTargetLabel[lastSaveResult.requestedChannel]}
                        </span>
                        <span className="ml-1">，目前狀態：</span>
                        <span className="text-green-300 ml-1">
                          {ORDER_STATUS[lastSaveResult.currentStatus as keyof typeof ORDER_STATUS] ?? lastSaveResult.currentStatus}
                        </span>
                      </>
                    )
                    : lastSaveResult.statusChanged
                    ? (
                      <>
                        狀態已從{' '}
                        <span className="text-moon-muted">
                          {ORDER_STATUS[lastSaveResult.previousStatus as keyof typeof ORDER_STATUS] ?? lastSaveResult.previousStatus}
                        </span>
                        {' → '}
                        <span className="text-green-300">
                          {ORDER_STATUS[lastSaveResult.currentStatus as keyof typeof ORDER_STATUS] ?? lastSaveResult.currentStatus}
                        </span>
                      </>
                    )
                    : '訂單資料已儲存，本次未觸發狀態通知'}
                </p>
              </div>
              {lastSavedAt && (
                <div className="flex items-center gap-1 text-[11px] text-moon-muted">
                  <Clock3 size={12} />
                  <span>{new Date(lastSavedAt).toLocaleString('zh-TW', { hour12: false })}</span>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: 'email', label: '客戶 Email', result: lastSaveResult.channels.email },
                { key: 'discord', label: 'Discord', result: lastSaveResult.channels.discord },
                { key: 'n8n', label: 'n8n', result: lastSaveResult.channels.n8n },
              ].map(({ key, label, result }) => (
                <div key={key} className="border border-moon-border/50 bg-moon-black/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-moon-muted">{label}</p>
                    <span className={`border px-2 py-1 text-[10px] tracking-wider ${saveResultStateStyles[result.state]}`}>
                      {saveResultStateLabel[result.state]}
                    </span>
                  </div>
                  <p className="text-sm text-moon-text leading-relaxed">{result.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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

        <section className="border border-moon-border bg-moon-dark/40 p-5 space-y-3">
          <h2 className="text-xs text-moon-muted tracking-widest">付款資訊</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] text-moon-muted mb-0.5">付款方式</p>
              <p className="text-moon-text">
                {PAYMENT_METHOD_LABEL[order.payment_method ?? ''] || '未設定'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-moon-muted mb-0.5">Line Pay 交易號</p>
              <p className={order.linepay_transaction_id ? 'text-moon-accent font-mono break-all' : 'text-moon-muted'}>
                {order.payment_method === 'line_pay'
                  ? order.linepay_transaction_id || '待回填'
                  : '此訂單非 Line Pay'}
              </p>
            </div>
          </div>
        </section>

        <section className="border border-moon-border bg-moon-dark/40 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs text-moon-muted tracking-widest">通知鏈檢查</h2>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {notificationLoading && <Loader2 size={14} className="animate-spin text-moon-muted" />}
                {([
                  ['all', '重送全部'],
                  ['email', 'Email'],
                  ['discord', 'Discord'],
                  ['n8n', 'n8n'],
                ] as const).map(([target, label]) => (
                  <button
                    key={target}
                    onClick={() => handleResendNotifications(target)}
                    disabled={retryingTarget !== null}
                    className="flex items-center gap-2 border border-moon-border px-3 py-1.5 text-[11px] tracking-wider text-moon-text hover:border-moon-accent hover:text-moon-accent transition-colors disabled:opacity-50"
                  >
                    {retryingTarget === target ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <BellRing size={12} />
                    )}
                    {label}
                  </button>
                ))}
              </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-moon-border/60 bg-moon-black/40 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-moon-muted">
                <Mail size={13} />
                客戶 Email
              </div>
              <div className="flex items-start gap-2">
                <StatusIndicator ok={!!order.email && !!notificationStatus?.resend?.isConfigured} />
                <div className="text-xs leading-relaxed">
                  <p className="text-moon-text">
                    {order.email ? order.email : '此訂單沒有 Email'}
                  </p>
                  <p className="text-moon-muted">
                    {notificationStatus?.resend?.message ?? '尚未取得 Resend 狀態'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-moon-border/60 bg-moon-black/40 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-moon-muted">
                <BellRing size={13} />
                Discord
              </div>
              <div className="flex items-start gap-2">
                <StatusIndicator ok={!!notificationStatus?.discord?.isConfigured} />
                <p className="text-xs text-moon-muted leading-relaxed">
                  {notificationStatus?.discord?.message ?? '尚未取得 Discord 狀態'}
                </p>
              </div>
            </div>

            <div className="border border-moon-border/60 bg-moon-black/40 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-moon-muted">
                <Workflow size={13} />
                n8n
              </div>
              <div className="flex items-start gap-2">
                <StatusIndicator ok={!!notificationStatus?.n8n?.isConfigured} />
                <div className="text-xs leading-relaxed">
                  <p className="text-moon-muted">
                    {notificationStatus?.n8n?.message ?? '尚未取得 n8n 狀態'}
                  </p>
                  {notificationStatus?.n8n?.host && (
                    <p className="text-moon-text/70 font-mono">{notificationStatus.n8n.host}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border border-moon-border/40 bg-moon-black/30 px-4 py-3 space-y-2">
            <p className="text-xs text-moon-muted">本次儲存的通知預期</p>
            {!willChangeStatus ? (
              <p className="text-sm text-moon-muted">
                狀態未改變，這次儲存不會重送狀態通知。
              </p>
            ) : (
              <div className="space-y-1.5 text-sm">
                <p className="text-moon-text">
                  狀態將從 <span className="text-moon-muted">{ORDER_STATUS[order.status as keyof typeof ORDER_STATUS] ?? order.status}</span>
                  {' → '}
                  <span className="text-moon-accent">{ORDER_STATUS[form.status as keyof typeof ORDER_STATUS] ?? form.status}</span>
                </p>
                <p className={willTriggerCustomerEmail ? 'text-green-400' : 'text-moon-muted'}>
                  客戶 Email：{willTriggerCustomerEmail ? '會嘗試發送' : '這次不會發送'}
                </p>
                <p className={willTriggerOpsNotifications ? 'text-green-400' : 'text-moon-muted'}>
                  Discord / n8n：{willTriggerOpsNotifications ? '會嘗試同步' : '這次不會同步'}
                </p>
                {willTriggerCustomerEmail && !notificationStatus?.resend?.isConfigured && (
                  <p className="text-red-400 text-xs">
                    注意：目前 Resend 未完整設定，狀態更新成功也可能不會寄出 Email。
                  </p>
                )}
                {willTriggerOpsNotifications && !notificationStatus?.discord?.isConfigured && (
                  <p className="text-red-400 text-xs">
                    注意：目前 Discord 未設定，店家通知會略過。
                  </p>
                )}
              </div>
            )}
            <p className="text-[11px] text-moon-muted">
              如果剛剛有失敗或略過，可直接點右上角對應通道補送；請避免連點，以免外部通知重複。
            </p>
          </div>
        </section>

        <section className="border border-moon-border bg-moon-dark/40 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs text-moon-muted tracking-widest">通知歷史</h2>
            <p className="text-[11px] text-moon-muted">
              最近 {(order.notification_logs || []).length} 筆
            </p>
          </div>

          {(order.notification_logs || []).length === 0 ? (
            <p className="text-sm text-moon-muted">
              尚無通知紀錄。狀態變更或手動重送後，結果會顯示在這裡。
            </p>
          ) : (
            <div className="space-y-3">
              {(order.notification_logs || []).map((log) => (
                <div key={log.id} className="border border-moon-border/50 bg-moon-black/30 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm text-moon-text">
                        {triggerModeLabel[log.trigger_mode]} · {retryTargetLabel[log.requested_channel]}
                      </p>
                      <p className="text-xs text-moon-muted">
                        {log.previous_status
                          ? `${ORDER_STATUS[log.previous_status as keyof typeof ORDER_STATUS] ?? log.previous_status} → ${ORDER_STATUS[log.current_status as keyof typeof ORDER_STATUS] ?? log.current_status}`
                          : ORDER_STATUS[log.current_status as keyof typeof ORDER_STATUS] ?? log.current_status}
                      </p>
                    </div>
                    <p className="text-[11px] text-moon-muted">
                      {new Date(log.created_at).toLocaleString('zh-TW', { hour12: false })}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { key: 'email', label: '客戶 Email', state: log.email_state, message: log.email_message },
                      { key: 'discord', label: 'Discord', state: log.discord_state, message: log.discord_message },
                      { key: 'n8n', label: 'n8n', state: log.n8n_state, message: log.n8n_message },
                    ].map((channel) => (
                      <div key={channel.key} className="border border-moon-border/40 px-3 py-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-moon-muted">{channel.label}</p>
                          <span className={`border px-2 py-1 text-[10px] tracking-wider ${saveResultStateStyles[channel.state]}`}>
                            {saveResultStateLabel[channel.state]}
                          </span>
                        </div>
                        <p className="text-xs text-moon-text/80 leading-relaxed">{channel.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
          <div className="space-y-3">
            {form.items.length === 0 ? (
              <p className="text-moon-muted text-sm">（已無品項）</p>
            ) : (
              form.items.map((item, idx) => (
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
              ))
            )}
          </div>

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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.promo_code}
                  onChange={e => setForm(p => ({ ...p, promo_code: e.target.value.toUpperCase() }))}
                  placeholder="輸入代碼"
                  className="flex-1 bg-moon-black border border-moon-border text-moon-text text-sm px-3 py-2 focus:outline-none focus:border-moon-accent transition-colors font-mono"
                />
                {form.promo_code && (
                  <button
                    onClick={() => setForm(p => ({ ...p, promo_code: '' }))}
                    className="px-2 text-xs border border-moon-border text-moon-muted hover:border-red-400/60 hover:text-red-400 transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
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
