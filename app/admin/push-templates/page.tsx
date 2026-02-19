'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Send, MessageSquare, Smartphone } from 'lucide-react';

interface PushTemplate {
    id: string;
    name: string;
    channel: 'line' | 'sms' | 'push';
    template_type: 'order_update' | 'promotion' | 'reminder' | 'event' | 'custom';
    title?: string;
    message: string;
    image_url?: string;
    action_url?: string;
    variables: string[]; // ["customer_name", "order_id"] etc
    is_active: boolean;
    created_at: string;
}

export default function PushTemplatesPage() {
    const [templates, setTemplates] = useState<PushTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<PushTemplate | null>(null);

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
        } catch (error) {
            console.error('載入模板錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    const getChannelIcon = (channel: string) => {
        const icons: Record<string, string> = {
            line: '💬',
            sms: '📱',
            push: '🔔',
        };
        return icons[channel] || channel;
    };

    const getChannelLabel = (channel: string) => {
        const labels: Record<string, string> = {
            line: 'LINE',
            sms: '簡訊',
            push: '推送',
        };
        return labels[channel] || channel;
    };

    const getTemplateTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            order_update: '訂單更新',
            promotion: '推廣',
            reminder: '提醒',
            event: '活動',
            custom: '自訂',
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
                        onClick={() => {
                            setEditingTemplate(null);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors"
                    >
                        <Plus size={20} />
                        新增模板
                    </button>
                </div>

                {/* 頻道標籤 */}
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
                        <button
                            onClick={() => {
                                setEditingTemplate(null);
                                setShowForm(true);
                            }}
                            className="text-moon-accent hover:underline"
                        >
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
                                    {/* 左側：模板資訊 */}
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

                                        {/* 預覽 */}
                                        <div className="mb-3 max-w-sm">
                                            {renderPreview(template)}
                                        </div>

                                        {/* 變數 */}
                                        {template.variables.length > 0 && (
                                            <div className="text-xs text-moon-muted">
                                                可用變數: {template.variables.map(v => `{${v}}`).join(', ')}
                                            </div>
                                        )}
                                    </div>

                                    {/* 右側：操作按鈕 */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => {
                                                setEditingTemplate(template);
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
