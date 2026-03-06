'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Send, Eye, X, Copy, Check, AlertCircle, Code, Eye as EyeIcon } from 'lucide-react';
import Image from 'next/image';

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

const EMAIL_VARIABLES = [
    { key: '{order_id}', label: '訂單編號', desc: '例: ORD-2026-0001' },
    { key: '{customer_name}', label: '客戶名稱', desc: '收件人姓名' },
    { key: '{final_price}', label: '訂單金額', desc: '例: $500' },
    { key: '{pickup_time}', label: '取貨時間', desc: '例: 2026-03-08 14:00' },
    { key: '{delivery_address}', label: '配送地址', desc: '配送目的地地址' },
    { key: '{delivery_fee}', label: '配送費', desc: '配送費用' },
    { key: '{discount_amount}', label: '優惠金額', desc: '優惠碼折扣金額' },
    { key: '{promo_code}', label: '優惠碼', desc: '使用的優惠碼' },
];

const TEMPLATE_SNIPPETS = {
    order_confirmation: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #f5f5f5; padding: 20px; text-align: center;">
    <h1 style="color: #333; margin: 0;">訂單確認</h1>
  </div>
  
  <div style="padding: 20px; border: 1px solid #ddd;">
    <p>親愛的 {customer_name}，</p>
    <p>感謝您的訂購！您的訂單已確認。</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #ff6b6b; margin: 20px 0;">
      <p><strong>訂單編號:</strong> {order_id}</p>
      <p><strong>取貨時間:</strong> {pickup_time}</p>
      <p><strong>訂單金額:</strong> {final_price}</p>
      {discount_amount > 0 && <p><strong>優惠折扣:</strong> -{discount_amount}</p>}
    </div>
    
    <p>如有任何問題，歡迎聯絡我們。</p>
  </div>
  
  <div style="background: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px;">
    <p>© 2026 MoonMoon Dessert. All rights reserved.</p>
  </div>
</div>
    `,
    promotional: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white;">
    <h1 style="margin: 0; font-size: 28px;">🎉 特別優惠</h1>
  </div>
  
  <div style="padding: 30px; text-align: center;">
    <p style="font-size: 18px; color: #333;">
      親愛的 {customer_name}，
    </p>
    <p style="font-size: 16px; color: #666;">
      我們為您準備了特別優惠！
    </p>
    
    <div style="margin: 30px 0; padding: 20px; background: #fff3cd; border-radius: 5px;">
      <p style="font-size: 24px; color: #ff6b6b; margin: 0;">
        使用優惠碼: <strong>{promo_code}</strong>
      </p>
      <p style="color: #666;">享受 {discount_amount} 折扣</p>
    </div>
    
    <a href="#" style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
      立即購買
    </a>
  </div>
</div>
    `,
};

const EMPTY_TEMPLATE = {
    name: '',
    type: 'custom' as const,
    subject: '',
    preview_text: '',
    html_content: '',
    is_active: true,
};

export default function EmailTemplatesPage() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<Partial<EmailTemplate> | null>(null);
    const [form, setForm] = useState(EMPTY_TEMPLATE);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');

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
            setError('無法載入模板');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const url = editingTemplate ? `/api/admin/email-templates/${editingTemplate.id}` : '/api/admin/email-templates';
            const method = editingTemplate ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (!response.ok) throw new Error('Failed to save template');

            await fetchTemplates();
            setShowForm(false);
            setForm(EMPTY_TEMPLATE);
            setEditingTemplate(null);
        } catch (error) {
            console.error('保存錯誤:', error);
            setError('保存失敗，請重試');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除此模板嗎？')) return;

        try {
            const response = await fetch(`/api/admin/email-templates/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete template');
            await fetchTemplates();
        } catch (error) {
            console.error('刪除錯誤:', error);
            setError('刪除失敗');
        }
    };

    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('html_content') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = form.html_content.substring(0, start);
            const after = form.html_content.substring(end);
            setForm({ ...form, html_content: before + variable + after });
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + variable.length, start + variable.length);
            }, 0);
        }
    };

    const insertSnippet = (type: keyof typeof TEMPLATE_SNIPPETS) => {
        setForm({ ...form, html_content: TEMPLATE_SNIPPETS[type] });
    };

    const copyCode = () => {
        navigator.clipboard.writeText(form.html_content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            order_confirmation: '訂單確認',
            shipping: '出貨通知',
            promotional: '行銷推廣',
            welcome: '歡迎信',
            custom: '自訂',
        };
        return labels[type] || type;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-moon-dark flex items-center justify-center">
                <div className="text-moon-muted">載入中...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-moon-dark p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-light text-moon-accent tracking-wider mb-2">
                            📧 Email 模板管理
                        </h1>
                        <p className="text-sm text-moon-muted">
                            設計和管理訂單確認、推廣郵件等電子郵件模板
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingTemplate(null);
                            setForm(EMPTY_TEMPLATE);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors font-semibold"
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

                {/* 模板列表 */}
                {templates.length === 0 ? (
                    <div className="border border-moon-border p-12 text-center rounded-lg">
                        <p className="text-moon-muted mb-4">尚無 Email 模板</p>
                        <button
                            onClick={() => {
                                setEditingTemplate(null);
                                setForm(EMPTY_TEMPLATE);
                                setShowForm(true);
                            }}
                            className="text-moon-accent hover:underline"
                        >
                            建立第一個模板
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="bg-moon-black border border-moon-border rounded-lg p-6 hover:border-moon-accent transition-colors"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-moon-accent">
                                                {template.name}
                                            </h3>
                                            <span className="text-xs bg-moon-border text-moon-muted px-3 py-1 rounded">
                                                {getTypeLabel(template.type)}
                                            </span>
                                            {template.is_active && (
                                                <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded">
                                                    ✓ 啟用
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-moon-muted mb-2">
                                            主旨: {template.subject}
                                        </p>
                                        <div className="text-xs text-moon-muted space-y-1">
                                            <p>使用次數: {template.used_count}</p>
                                            {template.last_used && (
                                                <p>最後使用: {new Date(template.last_used).toLocaleDateString('zh-TW')}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setPreviewTemplate(template);
                                                setShowPreview(true);
                                            }}
                                            className="p-2 text-moon-muted hover:text-moon-accent transition-colors"
                                            title="預覽"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingTemplate(template);
                                                setForm({
                                                    name: template.name,
                                                    type: template.type as 'custom',
                                                    subject: template.subject,
                                                    preview_text: template.preview_text || '',
                                                    html_content: template.html_content,
                                                    is_active: template.is_active,
                                                });
                                                setShowForm(true);
                                            }}
                                            className="p-2 text-moon-muted hover:text-moon-accent transition-colors"
                                            title="編輯"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(template.id)}
                                            className="p-2 text-moon-muted hover:text-red-500 transition-colors"
                                            title="刪除"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 編輯模態框 */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-moon-black border border-moon-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-moon-black border-b border-moon-border px-6 py-4 flex items-center justify-between">
                                <h2 className="text-2xl font-semibold text-moon-accent">
                                    {editingTemplate ? '編輯模板' : '新增模板'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="p-2 hover:bg-moon-border rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* 基本信息 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-moon-accent mb-2">
                                            模板名稱 *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                            placeholder="例: 訂單確認郵件"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-moon-accent mb-2">
                                            模板類型 *
                                        </label>
                                        <select
                                            value={form.type}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    type: e.target.value as typeof form.type,
                                                })
                                            }
                                            className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text focus:outline-none focus:border-moon-accent"
                                        >
                                            <option value="order_confirmation">訂單確認</option>
                                            <option value="shipping">出貨通知</option>
                                            <option value="promotional">行銷推廣</option>
                                            <option value="welcome">歡迎信</option>
                                            <option value="custom">自訂</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">
                                        郵件主旨 *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.subject}
                                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="例: 您的訂單已確認"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">
                                        預覽文本 (可選)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.preview_text || ''}
                                        onChange={(e) => setForm({ ...form, preview_text: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="在收件人列表中顯示的預覽"
                                    />
                                </div>

                                {/* HTML 編輯區 */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-semibold text-moon-accent">
                                            HTML 內容 *
                                        </label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={copyCode}
                                                className="p-2 text-moon-muted hover:text-moon-accent transition-colors"
                                                title="複製代碼"
                                            >
                                                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <textarea
                                        id="html_content"
                                        value={form.html_content}
                                        onChange={(e) => setForm({ ...form, html_content: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent font-mono text-sm"
                                        placeholder="輸入 HTML 內容..."
                                        rows={15}
                                        required
                                    />

                                    {/* 變數插入面板 */}
                                    <div className="mt-4 p-4 bg-moon-border/30 rounded-lg">
                                        <div className="mb-3">
                                            <p className="text-sm font-semibold text-moon-accent mb-2">📌 可用變數</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {EMAIL_VARIABLES.map((v) => (
                                                    <button
                                                        key={v.key}
                                                        type="button"
                                                        onClick={() => insertVariable(v.key)}
                                                        className="text-left text-xs bg-moon-black border border-moon-border px-3 py-2 rounded hover:border-moon-accent transition-colors"
                                                        title={v.desc}
                                                    >
                                                        <code className="text-moon-accent font-semibold">{v.key}</code>
                                                        <p className="text-moon-muted text-xs">{v.label}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-moon-accent mb-2">✨ 快速模板</p>
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => insertSnippet('order_confirmation')}
                                                    className="text-xs bg-moon-black border border-moon-border px-3 py-2 rounded hover:border-moon-accent transition-colors"
                                                >
                                                    訂單確認範本
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => insertSnippet('promotional')}
                                                    className="text-xs bg-moon-black border border-moon-border px-3 py-2 rounded hover:border-moon-accent transition-colors"
                                                >
                                                    推廣郵件範本
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

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
                                <div className="flex gap-4 pt-6 border-t border-moon-border">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 px-4 py-2 bg-moon-border text-moon-text hover:bg-moon-border/50 rounded transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPreviewTemplate(form);
                                            setShowPreview(true);
                                        }}
                                        className="flex-1 px-4 py-2 border border-moon-accent text-moon-accent hover:bg-moon-accent/10 rounded transition-colors"
                                    >
                                        預覽
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

                {/* 預覽模態框 */}
                {showPreview && previewTemplate && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-moon-black border border-moon-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-moon-black border-b border-moon-border px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-moon-accent">
                                    📧 郵件預覽
                                </h2>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="p-2 hover:bg-moon-border rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="bg-white rounded-lg p-6 text-black">
                                    <h3 className="text-lg font-semibold mb-4 border-b pb-4">
                                        {previewTemplate.subject || '(無主旨)'}
                                    </h3>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: previewTemplate.html_content || '<p>無內容</p>',
                                        }}
                                        className="text-sm"
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
