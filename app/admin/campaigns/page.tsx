'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Send, Target, Calendar, Eye, X } from 'lucide-react';

interface Campaign {
    id: string;
    title: string;
    description: string | null;
    type: 'email' | 'push' | 'sms';
    status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
    target_audience: string | null;
    scheduled_at: string | null;
    sent_count: number;
    open_count: number;
    created_at: string;
}

interface FormState {
    title: string;
    description: string;
    type: 'email' | 'push' | 'sms';
    status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
    target_audience: string;
    scheduled_at: string;
}

const EMPTY_FORM: FormState = {
    title: '',
    description: '',
    type: 'email',
    status: 'draft',
    target_audience: '',
    scheduled_at: '',
};

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/campaigns');
            if (!res.ok) throw new Error('Failed to fetch campaigns');
            const data = await res.json();
            setCampaigns(data.campaigns || []);
        } catch (error) {
            console.error('載入活動錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreate = () => {
        setEditingCampaign(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEdit = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setForm({
            title: campaign.title,
            description: campaign.description ?? '',
            type: campaign.type,
            status: campaign.status,
            target_audience: campaign.target_audience ?? '',
            scheduled_at: campaign.scheduled_at
                ? new Date(campaign.scheduled_at).toISOString().slice(0, 16)
                : '',
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingCampaign(null);
        setForm(EMPTY_FORM);
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) return;
        setSubmitting(true);
        try {
            const payload = {
                title: form.title.trim(),
                description: form.description.trim() || null,
                type: form.type,
                status: form.status,
                target_audience: form.target_audience.trim() || null,
                scheduled_at: form.scheduled_at
                    ? new Date(form.scheduled_at).toISOString()
                    : null,
            };

            const url = editingCampaign
                ? `/api/admin/campaigns/${editingCampaign.id}`
                : '/api/admin/campaigns';
            const method = editingCampaign ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed to save campaign');
            await fetchCampaigns();
            closeForm();
        } catch (error) {
            console.error('儲存活動錯誤:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除這個活動？')) return;
        try {
            const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete campaign');
            setCampaigns(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('刪除活動錯誤:', error);
        }
    };

    const filteredCampaigns = campaigns.filter(c =>
        statusFilter === 'all' || c.status === statusFilter
    );

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            draft:     'text-moon-muted bg-moon-muted/10',
            scheduled: 'text-blue-400 bg-blue-400/10',
            active:    'text-green-400 bg-green-400/10',
            completed: 'text-green-600 bg-green-600/10',
            paused:    'text-yellow-400 bg-yellow-400/10',
        };
        return colors[status] || colors.draft;
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            draft: '草稿', scheduled: '已排程', active: '進行中',
            completed: '已完成', paused: '暫停',
        };
        return labels[status] || status;
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            email: '📧 Email', push: '🔔 推送', sms: '💬 簡訊',
        };
        return labels[type] || type;
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
                            📢 行銷活動
                        </h1>
                        <p className="text-sm text-moon-muted">管理郵件、推送、簡訊等行銷活動</p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors"
                    >
                        <Plus size={20} />
                        新增活動
                    </button>
                </div>

                {/* 統計卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="border border-moon-border bg-moon-dark/70 p-4">
                        <p className="text-xs text-moon-muted mb-2">進行中活動</p>
                        <p className="text-2xl font-light text-moon-accent">
                            {campaigns.filter(c => c.status === 'active').length}
                        </p>
                    </div>
                    <div className="border border-moon-border bg-moon-dark/70 p-4">
                        <p className="text-xs text-moon-muted mb-2">已排程</p>
                        <p className="text-2xl font-light text-blue-400">
                            {campaigns.filter(c => c.status === 'scheduled').length}
                        </p>
                    </div>
                    <div className="border border-moon-border bg-moon-dark/70 p-4">
                        <p className="text-xs text-moon-muted mb-2">總發送數</p>
                        <p className="text-2xl font-light text-green-400">
                            {campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)}
                        </p>
                    </div>
                    <div className="border border-moon-border bg-moon-dark/70 p-4">
                        <p className="text-xs text-moon-muted mb-2">平均開啟率</p>
                        <p className="text-2xl font-light text-purple-400">
                            {(() => {
                                const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
                                const totalOpen = campaigns.reduce((s, c) => s + (c.open_count || 0), 0);
                                return totalSent > 0 ? Math.round((totalOpen / totalSent) * 100) : 0;
                            })()}%
                        </p>
                    </div>
                </div>

                {/* 篩選器 */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {['all', 'draft', 'scheduled', 'active', 'completed', 'paused'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 text-xs tracking-wider border transition-colors ${
                                statusFilter === s
                                    ? 'border-moon-accent bg-moon-accent/10 text-moon-accent'
                                    : 'border-moon-border text-moon-muted hover:border-moon-muted'
                            }`}
                        >
                            {s === 'all' ? '全部' : getStatusLabel(s)}
                        </button>
                    ))}
                </div>

                {/* 活動列表 */}
                {filteredCampaigns.length === 0 ? (
                    <div className="border border-moon-border p-12 text-center">
                        <p className="text-moon-muted mb-4">尚無活動</p>
                        <button onClick={openCreate} className="text-moon-accent hover:underline">
                            建立第一個活動 →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredCampaigns.map(campaign => (
                            <div
                                key={campaign.id}
                                className="border border-moon-border bg-moon-dark/70 p-4 hover:border-moon-accent/50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-moon-text font-medium">{campaign.title}</h3>
                                            <span className="text-xs bg-moon-border/50 text-moon-muted px-2 py-1">
                                                {getTypeLabel(campaign.type)}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(campaign.status)}`}>
                                                {getStatusLabel(campaign.status)}
                                            </span>
                                        </div>
                                        {campaign.description && (
                                            <p className="text-xs text-moon-muted mb-2">{campaign.description}</p>
                                        )}
                                        <div className="flex items-center gap-6 text-xs text-moon-muted">
                                            {campaign.target_audience && (
                                                <span className="flex items-center gap-1">
                                                    <Target size={14} /> {campaign.target_audience}
                                                </span>
                                            )}
                                            {campaign.scheduled_at && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {new Date(campaign.scheduled_at).toLocaleDateString('zh-TW')}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Send size={14} /> 已發送: {campaign.sent_count}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye size={14} /> 開啟: {campaign.open_count}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => openEdit(campaign)}
                                            className="p-2 text-moon-muted hover:text-moon-accent hover:bg-moon-accent/10 rounded transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(campaign.id)}
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

            {/* ── Modal ── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-moon-dark border border-moon-border w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-moon-border">
                            <h2 className="text-moon-accent tracking-wider">
                                {editingCampaign ? '編輯活動' : '新增活動'}
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
                                <label className="block text-xs text-moon-muted mb-1">活動標題 *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="例：夏季甜點優惠"
                                    className="w-full bg-moon-black border border-moon-border text-moon-text px-3 py-2 text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 說明 */}
                            <div>
                                <label className="block text-xs text-moon-muted mb-1">說明</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="活動說明（選填）"
                                    rows={2}
                                    className="w-full bg-moon-black border border-moon-border text-moon-text px-3 py-2 text-sm focus:outline-none focus:border-moon-accent resize-none"
                                />
                            </div>

                            {/* 類型 + 狀態 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-moon-muted mb-1">類型</label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm(f => ({ ...f, type: e.target.value as FormState['type'] }))}
                                        className="w-full bg-moon-black border border-moon-border text-moon-text px-3 py-2 text-sm focus:outline-none focus:border-moon-accent"
                                    >
                                        <option value="email">📧 Email</option>
                                        <option value="push">🔔 推送</option>
                                        <option value="sms">💬 簡訊</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-moon-muted mb-1">狀態</label>
                                    <select
                                        value={form.status}
                                        onChange={e => setForm(f => ({ ...f, status: e.target.value as FormState['status'] }))}
                                        className="w-full bg-moon-black border border-moon-border text-moon-text px-3 py-2 text-sm focus:outline-none focus:border-moon-accent"
                                    >
                                        <option value="draft">草稿</option>
                                        <option value="scheduled">已排程</option>
                                        <option value="active">進行中</option>
                                        <option value="paused">暫停</option>
                                        <option value="completed">已完成</option>
                                    </select>
                                </div>
                            </div>

                            {/* 發送對象 */}
                            <div>
                                <label className="block text-xs text-moon-muted mb-1">發送對象</label>
                                <input
                                    type="text"
                                    value={form.target_audience}
                                    onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
                                    placeholder="例：所有客戶、VIP 會員"
                                    className="w-full bg-moon-black border border-moon-border text-moon-text px-3 py-2 text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 排程時間 */}
                            <div>
                                <label className="block text-xs text-moon-muted mb-1">排程時間</label>
                                <input
                                    type="datetime-local"
                                    value={form.scheduled_at}
                                    onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                                    className="w-full bg-moon-black border border-moon-border text-moon-text px-3 py-2 text-sm focus:outline-none focus:border-moon-accent"
                                />
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
                                {submitting ? '儲存中...' : editingCampaign ? '儲存變更' : '建立活動'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
