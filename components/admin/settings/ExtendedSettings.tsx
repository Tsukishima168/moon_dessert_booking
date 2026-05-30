'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Save,
  Store,
  CreditCard,
  Truck,
  ClipboardList,
  Bell,
  Clock,
} from 'lucide-react';
import type {
  StoreInfo,
  PaymentSettings,
  DeliverySettings,
  OrderRules,
  NotificationSettings,
  BusinessHours,
} from '@/src/services/settings.service';

interface ResolvedSettings {
  store_info: StoreInfo;
  payment_settings: PaymentSettings;
  delivery_settings: DeliverySettings;
  order_rules: OrderRules;
  notification_settings: NotificationSettings;
  business_hours: BusinessHours;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const inputCls =
  'w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent';

// ── 共用小元件 ──────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-moon-muted mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-moon-muted/60 mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5"
      />
      <div>
        <span className="text-moon-text">{label}</span>
        {hint && <p className="text-xs text-moon-muted/60">{hint}</p>}
      </div>
    </label>
  );
}

function SectionCard({
  icon,
  title,
  saving,
  onSave,
  children,
}: {
  icon: ReactNode;
  title: string;
  saving: boolean;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border border-moon-border bg-moon-dark/30 p-6">
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h2 className="text-lg text-moon-text font-light tracking-wider">{title}</h2>
      </div>
      <div className="space-y-6">
        {children}
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
    </div>
  );
}

// ── 1. 店家資訊 ─────────────────────────────────────────────
function StoreInfoSection({
  value,
  saving,
  onSave,
}: {
  value: StoreInfo;
  saving: boolean;
  onSave: (v: StoreInfo) => void;
}) {
  const [f, setF] = useState<StoreInfo>(value);
  useEffect(() => setF(value), [value]);
  return (
    <SectionCard
      icon={<Store className="text-moon-accent" size={20} />}
      title="店家資訊"
      saving={saving}
      onSave={() => onSave(f)}
    >
      <Field label="店名">
        <input className={inputCls} value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} />
      </Field>
      <Field label="電話">
        <input className={inputCls} value={f.phone} onChange={(e) => setF((p) => ({ ...p, phone: e.target.value }))} />
      </Field>
      <Field label="LINE ID">
        <input className={inputCls} value={f.line_id} onChange={(e) => setF((p) => ({ ...p, line_id: e.target.value }))} />
      </Field>
      <Field label="客服 Email" hint="訂單通知信顯示用">
        <input className={inputCls} value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} />
      </Field>
      <Field label="地址">
        <input className={inputCls} value={f.address} onChange={(e) => setF((p) => ({ ...p, address: e.target.value }))} />
      </Field>
    </SectionCard>
  );
}

// ── 2. 付款與匯款 ───────────────────────────────────────────
function PaymentSection({
  value,
  saving,
  onSave,
}: {
  value: PaymentSettings;
  saving: boolean;
  onSave: (v: PaymentSettings) => void;
}) {
  const [f, setF] = useState<PaymentSettings>(value);
  useEffect(() => setF(value), [value]);
  return (
    <SectionCard
      icon={<CreditCard className="text-moon-accent" size={20} />}
      title="付款與匯款"
      saving={saving}
      onSave={() => onSave(f)}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="銀行名稱">
          <input className={inputCls} value={f.bank_name} onChange={(e) => setF((p) => ({ ...p, bank_name: e.target.value }))} />
        </Field>
        <Field label="銀行代碼">
          <input className={inputCls} value={f.bank_code} onChange={(e) => setF((p) => ({ ...p, bank_code: e.target.value }))} />
        </Field>
        <Field label="分行">
          <input className={inputCls} value={f.bank_branch} onChange={(e) => setF((p) => ({ ...p, bank_branch: e.target.value }))} />
        </Field>
        <Field label="戶名">
          <input className={inputCls} value={f.account_holder} onChange={(e) => setF((p) => ({ ...p, account_holder: e.target.value }))} />
        </Field>
      </div>
      <Field label="銀行帳號" hint="此帳號會出現在客戶的轉帳通知信中">
        <input className={inputCls} value={f.bank_account} onChange={(e) => setF((p) => ({ ...p, bank_account: e.target.value }))} />
      </Field>
      <div className="border-t border-moon-border/40 pt-4 space-y-3">
        <p className="text-sm text-moon-muted">啟用的付款方式</p>
        <Toggle
          checked={f.methods.bank_transfer}
          onChange={(v) => setF((p) => ({ ...p, methods: { ...p.methods, bank_transfer: v } }))}
          label="銀行轉帳"
        />
        <Toggle
          checked={f.methods.line_pay}
          onChange={(v) => setF((p) => ({ ...p, methods: { ...p.methods, line_pay: v } }))}
          label="LINE Pay"
          hint="需後端已設定 LINE Pay 金鑰才會生效"
        />
      </div>
    </SectionCard>
  );
}

// ── 3. 配送與取貨 ───────────────────────────────────────────
function DeliverySection({
  value,
  saving,
  onSave,
}: {
  value: DeliverySettings;
  saving: boolean;
  onSave: (v: DeliverySettings) => void;
}) {
  const [f, setF] = useState<DeliverySettings>(value);
  const [areasText, setAreasText] = useState(value.delivery_areas.join(', '));
  useEffect(() => {
    setF(value);
    setAreasText(value.delivery_areas.join(', '));
  }, [value]);
  const handleSave = () =>
    onSave({
      ...f,
      delivery_areas: areasText.split(',').map((s) => s.trim()).filter(Boolean),
    });
  return (
    <SectionCard
      icon={<Truck className="text-moon-accent" size={20} />}
      title="配送與取貨"
      saving={saving}
      onSave={handleSave}
    >
      <div className="space-y-3">
        <Toggle
          checked={f.pickup_available}
          onChange={(v) => setF((p) => ({ ...p, pickup_available: v }))}
          label="開放自取"
        />
        <Toggle
          checked={f.delivery_available}
          onChange={(v) => setF((p) => ({ ...p, delivery_available: v }))}
          label="開放宅配"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="運費 (元)">
          <input
            type="number"
            min="0"
            className={inputCls}
            value={f.delivery_fee}
            onChange={(e) => setF((p) => ({ ...p, delivery_fee: parseInt(e.target.value) || 0 }))}
          />
        </Field>
        <Field label="免運門檻 (元)" hint="訂單金額達此值免運，0 為不提供免運">
          <input
            type="number"
            min="0"
            className={inputCls}
            value={f.free_delivery_threshold}
            onChange={(e) => setF((p) => ({ ...p, free_delivery_threshold: parseInt(e.target.value) || 0 }))}
          />
        </Field>
      </div>
      <Field label="配送區域" hint="以逗號分隔，例如：台南市, 高雄市">
        <input className={inputCls} value={areasText} onChange={(e) => setAreasText(e.target.value)} />
      </Field>
    </SectionCard>
  );
}

// ── 4. 訂單規則 ─────────────────────────────────────────────
function OrderRulesSection({
  value,
  saving,
  onSave,
}: {
  value: OrderRules;
  saving: boolean;
  onSave: (v: OrderRules) => void;
}) {
  const [f, setF] = useState<OrderRules>(value);
  useEffect(() => setF(value), [value]);
  return (
    <SectionCard
      icon={<ClipboardList className="text-moon-accent" size={20} />}
      title="訂單規則"
      saving={saving}
      onSave={() => onSave(f)}
    >
      <Field label="最低消費金額 (元)" hint="0 為不限制；前台結帳會擋低於此金額的訂單">
        <input
          type="number"
          min="0"
          className={inputCls}
          value={f.minimum_order_amount}
          onChange={(e) => setF((p) => ({ ...p, minimum_order_amount: parseInt(e.target.value) || 0 }))}
        />
      </Field>
      <div className="space-y-3">
        <Toggle
          checked={f.order_notes_enabled}
          onChange={(v) => setF((p) => ({ ...p, order_notes_enabled: v }))}
          label="開放訂單備註"
          hint="允許客戶在結帳時填寫備註"
        />
        <Toggle
          checked={f.require_phone}
          onChange={(v) => setF((p) => ({ ...p, require_phone: v }))}
          label="電話必填"
        />
      </div>
    </SectionCard>
  );
}

// ── 5. 通知開關 ─────────────────────────────────────────────
function NotificationSection({
  value,
  saving,
  onSave,
}: {
  value: NotificationSettings;
  saving: boolean;
  onSave: (v: NotificationSettings) => void;
}) {
  const [f, setF] = useState<NotificationSettings>(value);
  useEffect(() => setF(value), [value]);
  return (
    <SectionCard
      icon={<Bell className="text-moon-accent" size={20} />}
      title="通知開關"
      saving={saving}
      onSave={() => onSave(f)}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-moon-text mb-2">新訂單成立</p>
          <Toggle
            checked={f.order_created.discord}
            onChange={(v) => setF((p) => ({ ...p, order_created: { discord: v } }))}
            label="Discord 通知店家"
          />
        </div>
        <div className="border-t border-moon-border/40 pt-4">
          <p className="text-sm text-moon-text mb-2">訂單狀態變更</p>
          <div className="space-y-3">
            <Toggle
              checked={f.order_status.discord}
              onChange={(v) => setF((p) => ({ ...p, order_status: { ...p.order_status, discord: v } }))}
              label="Discord 通知店家"
            />
            <Toggle
              checked={f.order_status.email}
              onChange={(v) => setF((p) => ({ ...p, order_status: { ...p.order_status, email: v } }))}
              label="Email 通知客戶"
            />
          </div>
        </div>
        <div className="border-t border-moon-border/40 pt-4">
          <p className="text-sm text-moon-text mb-2">取貨提醒</p>
          <Toggle
            checked={f.pickup_reminder.discord}
            onChange={(v) => setF((p) => ({ ...p, pickup_reminder: { discord: v } }))}
            label="Discord 通知店家"
          />
        </div>
      </div>
    </SectionCard>
  );
}

// ── 6. 營業時間 ─────────────────────────────────────────────
function BusinessHoursSection({
  value,
  saving,
  onSave,
}: {
  value: BusinessHours;
  saving: boolean;
  onSave: (v: BusinessHours) => void;
}) {
  const [f, setF] = useState<BusinessHours>(value);
  const [closuresText, setClosuresText] = useState(value.special_closures.join(', '));
  useEffect(() => {
    setF(value);
    setClosuresText(value.special_closures.join(', '));
  }, [value]);
  const toggleDay = (i: number) =>
    setF((p) => ({
      ...p,
      closed_days: p.closed_days.includes(i)
        ? p.closed_days.filter((x) => x !== i)
        : [...p.closed_days, i].sort((a, b) => a - b),
    }));
  const handleSave = () =>
    onSave({
      ...f,
      special_closures: closuresText.split(',').map((s) => s.trim()).filter(Boolean),
    });
  return (
    <SectionCard
      icon={<Clock className="text-moon-accent" size={20} />}
      title="營業時間"
      saving={saving}
      onSave={handleSave}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="平日時段" hint="例如 10:00-18:00">
          <input className={inputCls} value={f.weekday_hours} onChange={(e) => setF((p) => ({ ...p, weekday_hours: e.target.value }))} />
        </Field>
        <Field label="週末時段">
          <input className={inputCls} value={f.weekend_hours} onChange={(e) => setF((p) => ({ ...p, weekend_hours: e.target.value }))} />
        </Field>
      </div>
      <Field label="每週固定公休" hint="點選公休的星期">
        <div className="flex gap-2 flex-wrap">
          {WEEKDAYS.map((d, i) => {
            const on = f.closed_days.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`w-10 h-10 border text-sm transition-colors ${
                  on
                    ? 'bg-moon-accent text-moon-black border-moon-accent'
                    : 'bg-moon-black text-moon-muted border-moon-border hover:border-moon-accent'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="特殊公休日" hint="以逗號分隔日期，例如：2026-06-01, 2026-06-15">
        <input className={inputCls} value={closuresText} onChange={(e) => setClosuresText(e.target.value)} />
      </Field>
    </SectionCard>
  );
}

// ── 容器 ────────────────────────────────────────────────────
export default function ExtendedSettings() {
  const [data, setData] = useState<ResolvedSettings | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const res = await fetch('/api/admin/settings/resolved');
      if (res.ok) setData(await res.json());
    } catch (error) {
      console.error('載入進階設定錯誤:', error);
    }
  }

  async function save(key: string, value: unknown) {
    setSavingKey(key);
    setMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: key, setting_value: value }),
      });
      if (!res.ok) throw new Error('save failed');
      setMessage('✅ 已儲存');
      setTimeout(() => setMessage(''), 2500);
      await load();
    } catch (error) {
      console.error('儲存設定錯誤:', error);
      setMessage('❌ 儲存失敗');
    } finally {
      setSavingKey(null);
    }
  }

  if (!data) {
    return (
      <div className="text-center py-6 text-moon-muted text-sm border border-dashed border-moon-border/50">
        載入進階設定中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 border ${
            message.includes('✅')
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {message}
        </div>
      )}
      <StoreInfoSection value={data.store_info} saving={savingKey === 'store_info'} onSave={(v) => save('store_info', v)} />
      <PaymentSection value={data.payment_settings} saving={savingKey === 'payment_settings'} onSave={(v) => save('payment_settings', v)} />
      <DeliverySection value={data.delivery_settings} saving={savingKey === 'delivery_settings'} onSave={(v) => save('delivery_settings', v)} />
      <OrderRulesSection value={data.order_rules} saving={savingKey === 'order_rules'} onSave={(v) => save('order_rules', v)} />
      <NotificationSection value={data.notification_settings} saving={savingKey === 'notification_settings'} onSave={(v) => save('notification_settings', v)} />
      <BusinessHoursSection value={data.business_hours} saving={savingKey === 'business_hours'} onSave={(v) => save('business_hours', v)} />
    </div>
  );
}
