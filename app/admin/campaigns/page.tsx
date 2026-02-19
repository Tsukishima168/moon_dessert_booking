'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Send, TrendingUp, Target, Calendar, Eye, Users } from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
    description?: string;
    type: 'email' | 'push' | 'sms' | 'social';
    status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused';
    target_audience: string;
    start_date: string;
    end_date?: string;
    template_id?: string;
    created_at: string;
    stats: {
        sent: number;
        opened: number;
        clicked: number;
    };
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/campaigns');
            if (!response.ok) throw new Error('Failed to fetch campaigns');
            const data = await response.json();
            setCampaigns(data.campaigns || []);
        } catch (error) {
            console.error('載入活動錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCampaigns = campaigns.filter(c => 
        statusFilter === 'all' || c.status === statusFilter
    );

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            draft: 'text-moon-muted bg-moon-muted/10',
            scheduled: 'text-blue-400 bg-blue-400/10',
            active: 'text-green-400 bg-green-400/10',
            completed: 'text-green-600 bg-green-600/10',
            paused: 'text-yellow-400 bg-yellow-400/10',
        };
        return colors[status] || colors.draft;
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            draft: '草稿',
            scheduled: '已排程',
            active: '進行中',
            completed: '已完成',
            paused: '暫停',
        };
        return labels[status] || status;
    };

    const getCampaignTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            email: '📧 Email',
            push: '🔔 推送',
            sms: '💬 簡訊',
            social: '📱 社群',
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
                        <p className="text-sm text-moon-muted">
                            管理郵件、推送、簡訊等行銷活動
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingCampaign(null);
                            setShowForm(true);
                        }}
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
                            {campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0)}
                        </p>
                    </div>
                    <div className="border border-moon-border bg-moon-dark/70 p-4">
                        <p className="text-xs text-moon-muted mb-2">平均開啟率</p>
                        <p className="text-2xl font-light text-purple-400">
                            {campaigns.length > 0
                                ? Math.round(
                                    (campaigns.reduce((sum, c) => sum + (c.stats?.opened || 0), 0) /
                                        campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 1)) *
                                        100
                                  )
                                : 0}%
                        </p>
                    </div>
                </div>

                {/* 篩選器 */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {['all', 'draft', 'scheduled', 'active', 'completed', 'paused'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 text-xs tracking-wider border transition-colors ${
                                statusFilter === status
                                    ? 'border-moon-accent bg-moon-accent/10 text-moon-accent'
                                    : 'border-moon-border text-moon-muted hover:border-moon-muted'
                            }`}
                        >
                            {status === 'all' ? '全部' : getStatusLabel(status)}
                        </button>
                    ))}
                </div>

                {/* 活動列表 */}
                {filteredCampaigns.length === 0 ? (
                    <div className="border border-moon-border p-12 text-center">
                        <p className="text-moon-muted mb-4">尚無活動</p>
                        <button
                            onClick={() => {
                                setEditingCampaign(null);
                                setShowForm(true);
                            }}
                            className="text-moon-accent hover:underline"
                        >
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
                                    {/* 左側：活動資訊 */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-moon-text font-medium">{campaign.name}</h3>
                                            <span className="text-xs bg-moon-border/50 text-moon-muted px-2 py-1">
                                                {getCampaignTypeLabel(campaign.type)}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(campaign.status)}`}>
                                                {getStatusLabel(campaign.status)}
                                            </span>
                                        </div>
                                        {campaign.description && (
                                            <p className="text-xs text-moon-muted mb-2">{campaign.description}</p>
                                        )}
                                        <div className="flex items-center gap-6 text-xs text-moon-muted">
                                            <span className="flex items-center gap-1">
                                                <Target size={14} /> {campaign.target_audience}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} /> {new Date(campaign.start_date).toLocaleDateString('zh-TW')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Send size={14} /> 已發送: {campaign.stats?.sent || 0}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Eye size={14} /> 開啟: {campaign.stats?.opened || 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 右側：操作按鈕 */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {campaign.status === 'draft' && (
                                            <button className="p-2 text-moon-accent hover:bg-moon-accent/10 rounded transition-colors" title="發送">
                                                <Send size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setEditingCampaign(campaign);
                                                setShowForm(true);
                                            }}
                                            className="p-2 text-moon-muted hover:text-moon-accent hover:bg-moon-accent/10 rounded transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button className="p-2 text-moon-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
