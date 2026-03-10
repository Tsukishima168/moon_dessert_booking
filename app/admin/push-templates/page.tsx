'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

interface PushTemplate {
    id: string;
    name: string;
    channel: 'line' | 'sms' | 'push';
    template_type: 'order_update' | 'promotion' | 'reminder' | 'event' | 'custom';
    title?: string;
    message: string;
    image_url?: string;
    action_url?: string;
    variables: string[];
    is_active: boolean;
    created_at: string;
}

type FormState = {
    name: string;
    channel: 'line' | 'sms' | 'push';
    template_type: 'order_update' | 'promotion' | 'reminder' | 'event' | 'custom';
    title: string;
    message: string;
    image_url: string;
    action_url: string;
    variables_raw: string; // comma-separated input
    is_active: boolean;
};

const EMPTY_FORM: FormState = {
    name: '',
    channel: 'line',
    template_type: 'order_update',
    title: '',
    message: '',
    image_url: '',
    action_url: '',
    variables_raw: '',
    is_active: true,
};

export default function PushTemplatesPage() {
    const [templates, setTemplates] = useState<PushTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PushTemplate | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/push-templates');
            if (!response.ok) throw new Error('Failed to fetch templates');
            const data = await response.json();
            setTemplates(data.templates || []);
        } catch (err) {
            console.error('載入模板錯誤:', err);
            setError('無法載入模板');
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingTemplate(null);
        setForm(EMPTY_FORM);
        setError('');
        setShowForm(true);
    };

    const openEdit = (template: PushTemplate) => {
        setEditingTemplate(template);
        setForm({
            name:          template.name,
            channel:       template.channel,
            template_type: template.template_type,
            title:         template.title         ?? '',
            message:       template.message,
            image_url:     template.image_url     ?? '',
            action_url:    template.action_url    ?? '',
            variables_raw: template.variables.join(', '),
            is_active:     template.is_active,
        });
        setError('');
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        const variables = form.variables_raw
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);

        const payload = {
            name:          form.name,
            channel:       form.channel,
            template_type: form.template_type,
            title:         form.title      || null,
            message:       form.message,
            image_url:     form.image_url  || null,
            action_url:    form.action_url || null,
            variables,
            is_active:     form.is_active,
        };

        try {
            const url    = editingTemplate ? `/api/admin/push-templates/${editingTemplate.id}` : '/api/admin/push-templates';
            const method = editingTemplate ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error((errData as { error?: string }).error || 'Failed to save template');
            }

            await fetchTemplates();
            setShowForm(false);
            setForm(EMPTY_FORM);
            setEditingTemplate(null);
        } catch (err) {
            console.error('保存錯誤:', err);
            setError(err instanceof Error ? err.message : '保存失敗，請重試');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除此模板嗎？')) return;

        try {
            const response = await fetch(`/api/admin/push-templates/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete template');
            await fetchTemplates();
        } catch (err) {
            console.error('刪除錯誤:', err);
            setError('刪除失敗');
        }
    };

    const getChannelIcon = (channel: string) => {
        const icons: Record<string, string> = { line: '💬', sms: '📱', push: '🔔' };
        return icons[channel] || channel;
    };

    const getChannelLabel = (channel: string) => {
        const labels: Record<string, string> = { line: 'LINE', sms: '簡訊', push: '推送' };
        return labels[channel] || channel;
    };

    const getTemplateTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            order_update: '訂單更新',
            promotion:    '推廣',
            reminder:     '提醒',
            event:        '活動',
            custom:       '自訂',
        };
        return labels[type] || type;
    };

    const renderPreview = (template: PushTemplate) => {
        if (template.channel === 'line') {
            return (
                <div className="bg-green-50 p-4 rounded text-sm text-moon-black">
                    <div className="font-bold mb-1">{template.title || 'LINE 訊息'}</div>
                    <div>{template.message}</div>
                    {template.image_url && (
                        <img src={template.image_url} alt="preview" className="mt-2 w-full rounded" />
                    )}
                </div>
            );
        }
        return (
            <div className="bg-blue-50 p-4 rounded text-sm text-moon-black">
                <div className="font-bold mb-1">{template.title || 'SMS 訊息'}</div>
                <div>{template.message}</div>
            </div>
        );
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
                            🔔 推送通知
                        </h1>
                        <p className="text-sm text-moon-muted">
                            管理 LINE、簡訊、推送通知等模板
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors"
                    >
                        <Plus size={20} />
                        新增模板
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded mb-6 flex items-center gap-2">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {/* 頻道統計 */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['line', 'sms', 'push'].map(channel => (
                        <div key={channel} className="border border-moon-border bg-moon-dark/70 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{getChannelIcon(channel)}</span>
                                <span className="text-sm text-moon-muted">{getChannelLabel(channel)}</span>
                            </div>
                            <p className="text-lg font-light text-moon-accent">
                                {templates.filter(t => t.channel === channel).length}
                            </p>
                        </div>
                    ))}
                </div>

                {/* 模板列表 */}
                {templates.length === 0 ? (
                    <div className="border border-moon-border p-12 text-center">
                        <p className="text-moon-muted mb-4">尚無推送模板</p>
                        <button onClick={openCreate} className="text-moon-accent hover:underline">
                            建立第一個模板 →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {templates.map(template => (
                            <div
                                key={template.id}
                                className={`border border-moon-border bg-moon-dark/70 p-4 hover:border-moon-accent/50 transition-colors ${
                                    !template.is_active ? 'opacity-60' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="font-medium text-moon-text truncate">{template.name}</h3>
                                            <span className="text-lg">{getChannelIcon(template.channel)}</span>
                                            <span className="text-xs bg-moon-border/50 text-moon-muted px-2 py-1 whitespace-nowrap">
                                                {getTemplateTypeLabel(template.template_type)}
                                            </span>
                                            <span className={`text-xs px-2 py-1 ${
                                                template.is_active
                                                    ? 'bg-green-400/10 text-green-400'
                                                    : 'bg-red-400/10 text-red-400'
                                            }`}>
                                                {template.is_active ? '啟用' : '停用'}
                                            </span>
                                        </div>

                                        <div className="mb-3 max-w-sm">
                                            {renderPreview(template)}
                                        </div>

                                        {template.variables.length > 0 && (
                                            <div className="text-xs text-moon-muted">
                                                可用變數: {template.variables.map(v => `{${v}}`).join(', ')}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => openEdit(template)}
                                            className="p-2 text-moon-muted hover:text-moon-accent hover:bg-moon-accent/10 rounded transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
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

                {/* 編輯 Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-moon-black border border-moon-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-moon-black border-b border-moon-border px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-moon-accent">
                                    {editingTemplate ? '編輯模板' : '新增模板'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="p-2 hover:bg-moon-border rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded text-sm flex items-center gap-2">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                {/* 名稱 */}
                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">
                                        模板名稱 *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="例: 訂單完成提醒"
                                        required
                                    />
                                </div>

                                {/* 渠道 + 類型 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-moon-accent mb-2">
                                            渠道 *
                                        </label>
                                        <select
                                            value={form.channel}
                                            onChange={(e) => setForm({ ...form, channel: e.target.value as FormState['channel'] })}
                                            className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text focus:outline-none focus:border-moon-accent"
                                        >
                                            <option value="line">💬 LINE</option>
                                            <option value="sms">📱 簡訊</option>
                                            <option value="push">🔔 推送</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-moon-accent mb-2">
                                            類型 *
                                        </label>
                                        <select
                                            value={form.template_type}
                                            onChange={(e) => setForm({ ...form, template_type: e.target.value as FormState['template_type'] })}
                                            className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text focus:outline-none focus:border-moon-accent"
                                        >
                                            <option value="order_update">訂單更新</option>
                                            <option value="promotion">推廣</option>
                                            <option value="reminder">提醒</option>
                                            <option value="event">活動</option>
                                            <option value="custom">自訂</option>
                                        </select>
                                    </div>
                                </div>

                                {/* 標題 */}
                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">
                                        訊息標題
                                    </label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="例: 您的訂單已完成"
                                    />
                                </div>

                                {/* 訊息內容 */}
                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">
                                        訊息內容 *
                                    </label>
                                    <textarea
                                        value={form.message}
                                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="例: 您的訂單 {order_id} 已完成，歡迎領取！"
                                        rows={4}
                                        required
                                    />
                                    <p className="text-xs text-moon-muted mt-1">使用 &#123;變數名&#125; 插入動態內容</p>
                                </div>

                                {/* 圖片 URL */}
                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">
                                        圖片 URL（選填）
                                    </label>
                                    <input
                                        type="url"
                                        value={form.image_url}
                                        onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="https://..."
                                    />
                                </div>

                                {/* Action URL */}
                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">
                                        連結 URL（選填）
                                    </label>
                                    <input
                                        type="url"
                                        value={form.action_url}
                                        onChange={(e) => setForm({ ...form, action_url: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="https://..."
                                    />
                                </div>

                                {/* 可用變數 */}
                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">
                                        可用變數（逗號分隔）
                                    </label>
                                    <input
                                        type="text"
                                        value={form.variables_raw}
                                        onChange={(e) => setForm({ ...form, variables_raw: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="例: order_id, customer_name, pickup_time"
                                    />
                                </div>

                                {/* 啟用 */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={form.is_active}
                                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                        className="w-4 h-4 accent-moon-accent"
                                    />
                                    <label htmlFor="is_active" className="text-sm text-moon-text">
                                        啟用此模板
                                    </label>
                                </div>

                                {/* 按鈕 */}
                                <div className="flex gap-4 pt-4 border-t border-moon-border">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 px-4 py-2 bg-moon-border text-moon-text hover:bg-moon-border/50 rounded transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 px-4 py-2 bg-moon-accent text-moon-black hover:bg-moon-text rounded transition-colors disabled:opacity-50"
                                    >
                                        {saving ? '保存中...' : '保存'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
