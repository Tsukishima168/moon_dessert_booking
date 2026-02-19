'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleRight, ToggleLeft, Zap, Calendar, Target } from 'lucide-react';

interface AutomationRule {
    id: string;
    name: string;
    trigger_type: 'order_placed' | 'order_completed' | 'birthday' | 'inactive' | 'milestone' | 'schedule';
    trigger_value?: string;
    action_type: 'email' | 'sms' | 'line' | 'multiple';
    template_id?: string;
    delay_minutes?: number;
    is_active: boolean;
    total_sent: number;
    created_at: string;
}

export default function MarketingAutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/marketing-automation');
            if (!response.ok) throw new Error('Failed to fetch rules');
            const data = await response.json();
            setRules(data.rules || []);
        } catch (error) {
            console.error('載入規則錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTriggerLabel = (type: string) => {
        const labels: Record<string, string> = {
            order_placed: '訂單已下單',
            order_completed: '訂單已完成',
            birthday: '生日',
            inactive: '長期未購買',
            milestone: '達成里程碑',
            schedule: '定期發送',
        };
        return labels[type] || type;
    };

    const getTriggerIcon = (type: string) => {
        const icons: Record<string, string> = {
            order_placed: '🛒',
            order_completed: '✅',
            birthday: '🎂',
            inactive: '⚠️',
            milestone: '🏆',
            schedule: '📅',
        };
        return icons[type] || '⚙️';
    };

    const getActionLabel = (type: string) => {
        const labels: Record<string, string> = {
            email: '📧 Email',
            sms: '💬 簡訊',
            line: '💬 LINE',
            multiple: '📢 多渠道',
        };
        return labels[type] || type;
    };

    const toggleRule = async (id: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/admin/marketing-automation/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !isActive }),
            });

            if (!response.ok) throw new Error('Failed to update rule');

            setRules(rules.map(r =>
                r.id === id ? { ...r, is_active: !isActive } : r
            ));
        } catch (error) {
            console.error('更新規則錯誤:', error);
        }
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
                        onClick={() => {
                            setEditingRule(null);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors"
                    >
                        <Plus size={20} />
                        新增規則
                    </button>
                </div>

                {/* 推薦範本 */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        {
                            icon: '🛒',
                            title: '訂單確認',
                            desc: '顧客下單後立即發送確認信',
                            template: 'order_placed',
                        },
                        {
                            icon: '🎂',
                            title: '生日祝賀',
                            desc: '生日當天發送優惠碼',
                            template: 'birthday',
                        },
                        {
                            icon: '⏰',
                            title: '尋回流失客戶',
                            desc: '30天未購買時發送優惠',
                            template: 'inactive',
                        },
                    ].map((template, idx) => (
                        <div
                            key={idx}
                            className="border border-moon-border/50 bg-moon-dark/70 p-4 hover:border-moon-accent/50 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="text-2xl mb-2">{template.icon}</div>
                                    <h3 className="text-moon-text font-medium">{template.title}</h3>
                                    <p className="text-xs text-moon-muted mt-1">{template.desc}</p>
                                </div>
                            </div>
                            <button className="text-xs text-moon-accent hover:underline group-hover:text-moon-text">
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
                                onClick={() => {
                                    setEditingRule(null);
                                    setShowForm(true);
                                }}
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
                                        {/* 左側：規則資訊 */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-lg">{getTriggerIcon(rule.trigger_type)}</span>
                                                <h3 className="font-medium text-moon-text">{rule.name}</h3>
                                                <span className={`text-xs px-2 py-1 ${
                                                    rule.is_active
                                                        ? 'bg-green-400/10 text-green-400'
                                                        : 'bg-red-400/10 text-red-400'
                                                }`}>
                                                    {rule.is_active ? '啟用' : '停用'}
                                                </span>
                                            </div>

                                            {/* 觸發條件 */}
                                            <div className="flex items-center gap-4 text-xs text-moon-muted mb-2">
                                                <span className="flex items-center gap-1">
                                                    <Target size={14} /> {getTriggerLabel(rule.trigger_type)}
                                                </span>
                                                {rule.delay_minutes && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={14} /> 延遲 {rule.delay_minutes} 分鐘
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Zap size={14} /> {getActionLabel(rule.action_type)}
                                                </span>
                                                <span>已發送: {rule.total_sent} 次</span>
                                            </div>
                                        </div>

                                        {/* 右側：操作 */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => toggleRule(rule.id, rule.is_active)}
                                                className={`p-2 rounded transition-colors ${
                                                    rule.is_active
                                                        ? 'text-green-400 hover:bg-green-400/10'
                                                        : 'text-red-400 hover:bg-red-400/10'
                                                }`}
                                            >
                                                {rule.is_active ? (
                                                    <ToggleRight size={20} />
                                                ) : (
                                                    <ToggleLeft size={20} />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingRule(rule);
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

                {/* 說明文字 */}
                <div className="mt-8 border border-moon-border/50 bg-moon-accent/5 p-6">
                    <h3 className="text-sm text-moon-accent tracking-wider mb-4">📚 如何設定自動化?</h3>
                    <ol className="text-sm text-moon-text space-y-2 list-decimal list-inside">
                        <li>點擊「新增規則」建立觸發條件</li>
                        <li>選擇觸發事件 (訂單、生日、不活躍等)</li>
                        <li>設定延遲時間 (例如訂單完成後 2 小時)</li>
                        <li>選擇發送方式 (Email、LINE、SMS)</li>
                        <li>指定使用的模板</li>
                        <li>啟用規則並開始自動發送</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
