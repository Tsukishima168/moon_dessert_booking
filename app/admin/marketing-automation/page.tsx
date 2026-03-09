'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleRight, ToggleLeft, Zap, Calendar, Target, X } from 'lucide-react';

interface AutomationRule {
    id: string;
    title: string;
    trigger_type: 'order' | 'birthday' | 'inactive';
    delay_minutes: number;
    channels: string[];
    is_active: boolean;
    sent_count: number;
    created_at: string;
}

interface FormState {
    title: string;
    trigger_type: 'order' | 'birthday' | 'inactive';
    delay_minutes: number;
    channels: string[];
}

const EMPTY_FORM: FormState = {
    title: '',
    trigger_type: 'order',
    delay_minutes: 0,
    channels: [],
};

const CHANNEL_OPTIONS = [
    { value: 'email', label: '📧 Email' },
    { value: 'line',  label: '💬 LINE' },
    { value: 'sms',   label: '📱 簡訊' },
    { value: 'push',  label: '🔔 推送' },
];

const TRIGGER_TEMPLATES = [
    {
        icon: '🛒',
        title: '訂單確認',
        desc: '顧客下單後立即發送確認信',
        trigger_type: 'order' as const,
        delay_minutes: 0,
        channels: ['email'],
    },
    {
        icon: '🎂',
        title: '生日祝賀',
        desc: '生日當天發送優惠碼',
        trigger_type: 'birthday' as const,
        delay_minutes: 480,
        channels: ['email', 'line'],
    },
    {
        icon: '⏰',
        title: '尋回流失客戶',
        desc: '30天未購買時發送優惠',
        trigger_type: 'inactive' as const,
        delay_minutes: 43200,
        channels: ['email'],
    },
];

export default function MarketingAutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/marketing-automation');
            if (!res.ok) throw new Error('Failed to fetch rules');
            const data = await res.json();
            setRules(data.rules || []);
        } catch (error) {
            console.error('載入規則錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = (defaults?: Partial<FormState>) => {
        setEditingRule(null);
        setForm({ ...EMPTY_FORM, ...defaults });
        setShowForm(true);
    };

    const openEdit = (rule: AutomationRule) => {
        setEditingRule(rule);
        setForm({
            title: rule.title,
            trigger_type: rule.trigger_type,
            delay_minutes: rule.delay_minutes,
            channels: rule.channels ?? [],
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingRule(null);
        setForm(EMPTY_FORM);
    };

    const toggleChannel = (channel: string) => {
        setForm(f => ({
            ...f,
            channels: f.channels.includes(channel)
                ? f.channels.filter(c => c !== channel)
                : [...f.channels, channel],
        }));
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) return;
        setSubmitting(true);
        try {
            const payload = {
                title: form.title.trim(),
                trigger_type: form.trigger_type,
                delay_minutes: form.delay_minutes,
                channels: form.channels,
            };

            const url = editingRule
                ? `/api/admin/marketing-automation/${editingRule.id}`
                : '/api/admin/marketing-automation';
            const method = editingRule ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed to save rule');
            await fetchRules();
            closeForm();
        } catch (error) {
            console.error('儲存規則錯誤:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除這個規則？')) return;
        try {
            const res = await fetch(`/api/admin/marketing-automation/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete rule');
            setRules(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('刪除規則錯誤:', error);
        }
    };

    const toggleRule = async (id: string, isActive: boolean) => {
        try {
            const res = await fetch(`/api/admin/marketing-automation/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !isActive }),
            });
            if (!res.ok) throw new Error('Failed to toggle rule');
            setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !isActive } : r));
        } catch (error) {
            console.error('更新規則錯誤:', error);
        }
    };

    const getTriggerLabel = (type: string) => {
        const labels: Record<string, string> = {
            order:    '訂單已下單',
            birthday: '生日',
            inactive: '長期未購買',
        };
        return labels[type] || type;
    };

    const getTriggerIcon = (type: string) => {
        const icons: Record<string, string> = {
            order: '🛒', birthday: '🎂', inactive: '⚠️',
        };
        return icons[type] || '⚙️';
    };

    const getChannelsLabel = (channels: string[]) => {
        if (!channels || channels.length === 0) return '—';
        const map: Record<string, string> = {
            email: 'Email', line: 'LINE', sms: '簡訊', push: '推送',
        };
        return channels.map(c => map[c] || c).join('、');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-moon-black flex items-center justify-center">
                <div className="text-moon-muted">載入中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-moon-black p-6">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-light text-moon-accent tracking-wider mb-2">
                            ⚡ 自動化行銷
                        </h1>
                        <p className="text-sm text-moon-muted">
                            設定自動觸發規則，在特定時機發送行銷訊息
                        </p>
                    </div>
                    <button
                        onClick={() => openCreate()}
                        className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors"
                    >
                        <Plus size={20} />
                        新增規則
                    </button>
                </div>

                {/* 推薦範本 */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TRIGGER_TEMPLATES.map((tpl, idx) => (
                        <div
                            key={idx}
                            className="border border-moon-border/50 bg-moon-dark/70 p-4 hover:border-moon-accent/50 transition-colors group"
                        >
                            <div className="mb-3">
                                <div className="text-2xl mb-2">{tpl.icon}</div>
                                <h3 className="text-moon-text font-medium">{tpl.title}</h3>
                                <p className="text-xs text-moon-muted mt-1">{tpl.desc}</p>
                            </div>
                            <button
                                onClick={() => openCreate({
                                    title: tpl.title,
                                    trigger_type: tpl.trigger_type,
                                    delay_minutes: tpl.delay_minutes,
                                    channels: tpl.channels,
                                })}
                                className="text-xs text-moon-accent hover:underline group-hover:text-moon-text"
                            >
                                + 建立此規則 →
                            </button>
                        </div>
                    ))}
                </div>

                {/* 已建立的規則 */}
                <div className="border border-moon-border bg-moon-dark/70 p-6">
                    <h2 className="text-lg text-moon-text font-light tracking-wider mb-6">已建立的規則</h2>

                    {rules.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-moon-muted mb-4">尚無自動化規則</p>
                            <button
                                onClick={() => openCreate()}
                                className="text-moon-accent hover:underline"
                            >
                                建立第一個規則 →
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rules.map(rule => (
                                <div
                                    key={rule.id}
                                    className={`border border-moon-border/50 p-4 hover:border-moon-accent/50 transition-colors ${
                                        !rule.is_active ? 'opacity-60' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-lg">{getTriggerIcon(rule.trigger_type)}</span>
                                                <h3 className="font-medium text-moon-text">{rule.title}</h3>
                                                <span className={`text-xs px-2 py-1 ${
                                                    rule.is_active
                                                        ? 'bg-green-400/10 text-green-400'
                                                        : 'bg-red-400/10 text-red-400'
                                                }`}>
                                                    {rule.is_active ? '啟用' : '停用'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-moon-muted">
                                                <span className="flex items-center gap-1">
                                                    <Target size={14} /> {getTriggerLabel(rule.trigger_type)}
                                                </span>
                                                {rule.delay_minutes > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={14} /> 延遲 {rule.delay_minutes} 分鐘
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Zap size={14} /> {getChannelsLabel(rule.channels)}
                                                </span>
                                                <span>已發送: {rule.sent_count} 次</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => toggleRule(rule.id, rule.is_active)}
                                                className={`p-2 rounded transition-colors ${
                                                    rule.is_active
                                                        ? 'text-green-400 hover:bg-green-400/10'
                                                        : 'text-red-400 hover:bg-red-400/10'
                                                }`}
                                                title={rule.is_active ? '停用' : '啟用'}
                                            >
                                                {rule.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            </button>
                                            <button
                                                onClick={() => openEdit(rule)}
                                                className="p-2 text-moon-muted hover:text-moon-accent hover:bg-moon-accent/10 rounded transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rule.id)}
                                                className="p-2 text-moon-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 說明文字 */}
                <div className="mt-8 border border-moon-border/50 bg-moon-accent/5 p-6">
                    <h3 className="text-sm text-moon-accent tracking-wider mb-4">📚 如何設定自動化?</h3>
                    <ol className="text-sm text-moon-text space-y-2 list-decimal list-inside">
                        <li>點擊「新增規則」建立觸發條件</li>
                        <li>選擇觸發事件 (訂單、生日、不活躍等)</li>
                        <li>設定延遲時間 (例如訂單完成後 2 小時)</li>
                        <li>選擇發送渠道 (Email、LINE、SMS)</li>
                        <li>啟用規則並開始自動發送</li>
                    </ol>
                </div>
            </div>

            {/* ── Modal ── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-moon-dark border border-moon-border w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-moon-border">
                            <h2 className="text-moon-accent tracking-wider">
                                {editingRule ? '編輯規則' : '新增自動化規則'}
                            </h2>
                            <button
                                onClick={closeForm}
                                className="text-moon-muted hover:text-moon-text transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* 標題 */}
                            <div>
                                <label className="block text-xs text-moon-muted mb-1">規則名稱 *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="例：訂單確認信"
                                    className="w-full bg-moon-black border border-moon-border text-moon-text px-3 py-2 text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 觸發條件 */}
                            <div>
                                <label className="block text-xs text-moon-muted mb-1">觸發條件</label>
                                <select
                                    value={form.trigger_type}
                                    onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value as FormState['trigger_type'] }))}
                                    className="w-full bg-moon-black border border-moon-border text-moon-text px-3 py-2 text-sm focus:outline-none focus:border-moon-accent"
                                >
                                    <option value="order">🛒 訂單已下單</option>
                                    <option value="birthday">🎂 生日當天</option>
                                    <option value="inactive">⚠️ 長期未購買</option>
                                </select>
                            </div>

                            {/* 延遲時間 */}
                            <div>
                                <label className="block text-xs text-moon-muted mb-1">
                                    延遲時間（分鐘）
                                    <span className="ml-2 text-moon-muted/60">
                                        {form.delay_minutes === 0
                                            ? '立即發送'
                                            : form.delay_minutes < 60
                                                ? `${form.delay_minutes} 分鐘後`
                                                : `${Math.round(form.delay_minutes / 60)} 小時後`}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={form.delay_minutes}
                                    onChange={e => setForm(f => ({ ...f, delay_minutes: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-moon-black border border-moon-border text-moon-text px-3 py-2 text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 渠道選擇 */}
                            <div>
                                <label className="block text-xs text-moon-muted mb-2">發送渠道（可多選）</label>
                                <div className="flex flex-wrap gap-2">
                                    {CHANNEL_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => toggleChannel(opt.value)}
                                            className={`px-3 py-1.5 text-xs border transition-colors ${
                                                form.channels.includes(opt.value)
                                                    ? 'border-moon-accent bg-moon-accent/10 text-moon-accent'
                                                    : 'border-moon-border text-moon-muted hover:border-moon-muted'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-6 border-t border-moon-border">
                            <button
                                onClick={closeForm}
                                className="px-4 py-2 text-sm text-moon-muted border border-moon-border hover:border-moon-text hover:text-moon-text transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !form.title.trim()}
                                className="px-6 py-2 text-sm bg-moon-accent text-moon-black hover:bg-moon-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? '儲存中...' : editingRule ? '儲存變更' : '建立規則'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
