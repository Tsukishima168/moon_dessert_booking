'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Send, Eye, Copy, Check } from 'lucide-react';

interface EmailTemplate {
    id: string;
    name: string;
    type: 'order_confirmation' | 'shipping' | 'promotional' | 'welcome' | 'custom';
    subject: string;
    preview_text?: string;
    html_content: string;
    is_active: boolean;
    used_count: number;
    last_used?: string;
    created_at: string;
}

export default function EmailTemplatesPage() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/email-templates');
            if (!response.ok) throw new Error('Failed to fetch templates');
            const data = await response.json();
            setTemplates(data.templates || []);
        } catch (error) {
            console.error('載入模板錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTemplateTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            order_confirmation: '訂單確認',
            shipping: '出貨通知',
            promotional: '行銷推廣',
            welcome: '歡迎信',
            custom: '自訂',
        };
        return labels[type] || type;
    };

    const copyTemplate = (template: EmailTemplate) => {
        navigator.clipboard.writeText(template.html_content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                            📧 Email 模板
                        </h1>
                        <p className="text-sm text-moon-muted">
                            管理訂單確認、出貨通知、推廣郵件等模板
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

                {/* 模板列表 */}
                {templates.length === 0 ? (
                    <div className="border border-moon-border p-12 text-center">
                        <p className="text-moon-muted mb-4">尚無 Email 模板</p>
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
                                className={`border border-moon-border bg-moon-dark/70 p-4 hover:border-moon-accent/50 transition-colors group ${
                                    !template.is_active ? 'opacity-60' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* 左側：模板資訊 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-medium text-moon-text truncate">{template.name}</h3>
                                            <span className="text-xs bg-moon-border/50 text-moon-muted px-2 py-1 whitespace-nowrap">
                                                {getTemplateTypeLabel(template.type)}
                                            </span>
                                            <span className={`text-xs px-2 py-1 ${
                                                template.is_active
                                                    ? 'bg-green-400/10 text-green-400'
                                                    : 'bg-red-400/10 text-red-400'
                                            }`}>
                                                {template.is_active ? '啟用' : '停用'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-6 text-xs text-moon-muted">
                                            <span>主旨: {template.subject}</span>
                                            <span>已使用: {template.used_count} 次</span>
                                            {template.last_used && (
                                                <span>最後使用: {new Date(template.last_used).toLocaleDateString('zh-TW')}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 右側：操作按鈕 */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setPreviewTemplate(template)}
                                            className="p-2 text-moon-muted hover:text-moon-accent hover:bg-moon-accent/10 rounded transition-colors"
                                            title="預覽"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => copyTemplate(template)}
                                            className="p-2 text-moon-muted hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                            title="複製"
                                        >
                                            {copied ? <Check size={18} /> : <Copy size={18} />}
                                        </button>
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

                {/* 預覽 Modal */}
                {previewTemplate && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-moon-dark border border-moon-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="border-b border-moon-border p-6 sticky top-0 bg-moon-dark">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg text-moon-accent mb-1">{previewTemplate.name}</h2>
                                        <p className="text-sm text-moon-muted">主旨: {previewTemplate.subject}</p>
                                    </div>
                                    <button
                                        onClick={() => setPreviewTemplate(null)}
                                        className="text-moon-muted hover:text-moon-text"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Preview Content */}
                            <div className="p-6">
                                <div className="bg-white text-moon-black p-6 rounded">
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: previewTemplate.html_content,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
