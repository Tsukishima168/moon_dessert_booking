'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Eye, X, Copy, Check, AlertCircle, Bold, Italic, List, Link as LinkIcon } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

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
    { key: '{order_id}',          label: '訂單編號', desc: '例: ORD-2026-0001' },
    { key: '{customer_name}',     label: '客戶名稱', desc: '收件人姓名' },
    { key: '{final_price}',       label: '訂單金額', desc: '例: $500' },
    { key: '{pickup_time}',       label: '取貨時間', desc: '例: 2026-03-08 14:00' },
    { key: '{delivery_address}',  label: '配送地址', desc: '配送目的地地址' },
    { key: '{delivery_fee}',      label: '配送費',   desc: '配送費用' },
    { key: '{discount_amount}',   label: '優惠金額', desc: '優惠碼折扣金額' },
    { key: '{promo_code}',        label: '優惠碼',   desc: '使用的優惠碼' },
];

// ── MOONMOON 風格模板 ──────────────────────────────────────────
const MOONMOON_ORDER_CONFIRMATION = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f5f0e8;">
  <div style="padding:40px 32px 24px;text-align:center;border-bottom:1px solid #c9a96e;">
    <h1 style="color:#c9a96e;font-weight:300;letter-spacing:0.3em;margin:0;font-size:22px;">MOON MOON</h1>
    <p style="color:#f5f0e8;opacity:0.5;font-size:11px;margin:8px 0 0;letter-spacing:0.2em;">月島甜點</p>
  </div>
  <div style="padding:32px;">
    <p style="line-height:1.8;">親愛的 {customer_name}，</p>
    <p style="line-height:1.8;">感謝您的訂購，您的訂單已確認。</p>
    <div style="border:1px solid #c9a96e;padding:20px;margin:24px 0;">
      <p style="color:#c9a96e;margin:0 0 12px;font-size:12px;letter-spacing:0.2em;">訂單明細</p>
      <p style="margin:6px 0;"><span style="opacity:0.6;">訂單編號</span>&nbsp;&nbsp;{order_id}</p>
      <p style="margin:6px 0;"><span style="opacity:0.6;">取貨時間</span>&nbsp;&nbsp;{pickup_time}</p>
      <p style="margin:6px 0;"><span style="opacity:0.6;">訂單金額</span>&nbsp;&nbsp;{final_price}</p>
    </div>
    <p style="line-height:1.8;opacity:0.8;">如有任何問題，歡迎與我們聯絡。</p>
  </div>
  <div style="padding:24px 32px 32px;text-align:center;border-top:1px solid rgba(201,169,110,0.3);">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:0.2em;margin:0;">月島甜點 · 台南安南區 · shop.kiwimu.com</p>
  </div>
</div>`;

const MOONMOON_READY_FOR_PICKUP = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f5f0e8;">
  <div style="padding:40px 32px 24px;text-align:center;border-bottom:1px solid #c9a96e;">
    <h1 style="color:#c9a96e;font-weight:300;letter-spacing:0.3em;margin:0;font-size:22px;">MOON MOON</h1>
    <p style="color:#f5f0e8;opacity:0.5;font-size:11px;margin:8px 0 0;letter-spacing:0.2em;">月島甜點</p>
  </div>
  <div style="padding:32px;">
    <p style="line-height:1.8;">親愛的 {customer_name}，</p>
    <p style="line-height:1.8;color:#c9a96e;">您的訂單現在可以取貨了！</p>
    <div style="border:1px solid #c9a96e;padding:20px;margin:24px 0;">
      <p style="color:#c9a96e;margin:0 0 12px;font-size:12px;letter-spacing:0.2em;">取貨資訊</p>
      <p style="margin:6px 0;"><span style="opacity:0.6;">訂單編號</span>&nbsp;&nbsp;{order_id}</p>
      <p style="margin:6px 0;"><span style="opacity:0.6;">取貨時間</span>&nbsp;&nbsp;{pickup_time}</p>
    </div>
    <p style="line-height:1.8;opacity:0.8;">期待在店裡見到您。</p>
  </div>
  <div style="padding:24px 32px 32px;text-align:center;border-top:1px solid rgba(201,169,110,0.3);">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:0.2em;margin:0;">月島甜點 · 台南安南區 · shop.kiwimu.com</p>
  </div>
</div>`;

const MOONMOON_CANCELLED = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f5f0e8;">
  <div style="padding:40px 32px 24px;text-align:center;border-bottom:1px solid #c9a96e;">
    <h1 style="color:#c9a96e;font-weight:300;letter-spacing:0.3em;margin:0;font-size:22px;">MOON MOON</h1>
    <p style="color:#f5f0e8;opacity:0.5;font-size:11px;margin:8px 0 0;letter-spacing:0.2em;">月島甜點</p>
  </div>
  <div style="padding:32px;">
    <p style="line-height:1.8;">親愛的 {customer_name}，</p>
    <p style="line-height:1.8;">很抱歉通知您，您的訂單（{order_id}）已取消。</p>
    <p style="line-height:1.8;opacity:0.8;">如有任何疑問，歡迎與我們聯絡，我們將盡快回覆。</p>
  </div>
  <div style="padding:24px 32px 32px;text-align:center;border-top:1px solid rgba(201,169,110,0.3);">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:0.2em;margin:0;">月島甜點 · 台南安南區 · shop.kiwimu.com</p>
  </div>
</div>`;

const TEMPLATE_SNIPPETS: Record<string, string> = {
    order_confirmation: MOONMOON_ORDER_CONFIRMATION,
    ready_for_pickup:   MOONMOON_READY_FOR_PICKUP,
    cancelled:          MOONMOON_CANCELLED,
};

type TemplateType = 'order_confirmation' | 'shipping' | 'promotional' | 'welcome' | 'custom';

const EMPTY_FORM = {
    name:         '',
    type:         'custom' as TemplateType,
    subject:      '',
    preview_text: '',
    is_active:    true,
};

// ── Tiptap Toolbar ─────────────────────────────────────────────
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
    if (!editor) return null;

    const setLink = () => {
        const url = window.prompt('連結網址 (https://...)');
        if (!url) return;
        editor.chain().focus().setLink({ href: url }).run();
    };

    return (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-moon-border bg-moon-border/30">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-2 rounded text-sm transition-colors ${editor.isActive('bold') ? 'bg-moon-accent text-moon-black' : 'text-moon-muted hover:text-moon-accent'}`}
                title="粗體"
            >
                <Bold size={14} />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-2 rounded text-sm transition-colors ${editor.isActive('italic') ? 'bg-moon-accent text-moon-black' : 'text-moon-muted hover:text-moon-accent'}`}
                title="斜體"
            >
                <Italic size={14} />
            </button>
            <div className="w-px h-5 bg-moon-border mx-1" />
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-moon-accent text-moon-black' : 'text-moon-muted hover:text-moon-accent'}`}
                title="標題"
            >
                H2
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-moon-accent text-moon-black' : 'text-moon-muted hover:text-moon-accent'}`}
                title="小標題"
            >
                H3
            </button>
            <div className="w-px h-5 bg-moon-border mx-1" />
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-2 rounded text-sm transition-colors ${editor.isActive('bulletList') ? 'bg-moon-accent text-moon-black' : 'text-moon-muted hover:text-moon-accent'}`}
                title="條列"
            >
                <List size={14} />
            </button>
            <button
                type="button"
                onClick={setLink}
                className={`p-2 rounded text-sm transition-colors ${editor.isActive('link') ? 'bg-moon-accent text-moon-black' : 'text-moon-muted hover:text-moon-accent'}`}
                title="連結"
            >
                <LinkIcon size={14} />
            </button>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────
export default function EmailTemplatesPage() {
    const [templates, setTemplates]         = useState<EmailTemplate[]>([]);
    const [loading, setLoading]             = useState(true);
    const [showForm, setShowForm]           = useState(false);
    const [showPreview, setShowPreview]     = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [previewHtml, setPreviewHtml]     = useState('');
    const [previewSubject, setPreviewSubject] = useState('');
    const [form, setForm]                   = useState(EMPTY_FORM);
    const [copied, setCopied]               = useState(false);
    const [saving, setSaving]               = useState(false);
    const [error, setError]                 = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'min-h-[280px] p-4 focus:outline-none text-moon-text leading-relaxed',
            },
        },
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/email-templates');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setTemplates(data.templates ?? []);
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
        editor?.commands.setContent('');
        setError('');
        setShowForm(true);
    };

    const openEdit = (template: EmailTemplate) => {
        setEditingTemplate(template);
        setForm({
            name:         template.name,
            type:         template.type as TemplateType,
            subject:      template.subject,
            preview_text: template.preview_text ?? '',
            is_active:    template.is_active,
        });
        editor?.commands.setContent(template.html_content ?? '');
        setError('');
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        const html_content = editor?.getHTML() ?? '';

        try {
            const url    = editingTemplate ? `/api/admin/email-templates/${editingTemplate.id}` : '/api/admin/email-templates';
            const method = editingTemplate ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, html_content }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error((errData as { error?: string }).error ?? 'Failed to save');
            }

            await fetchTemplates();
            setShowForm(false);
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
            const res = await fetch(`/api/admin/email-templates/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            await fetchTemplates();
        } catch (err) {
            console.error('刪除錯誤:', err);
            setError('刪除失敗');
        }
    };

    const openPreview = (htmlContent: string, subject: string) => {
        setPreviewHtml(htmlContent);
        setPreviewSubject(subject);
        setShowPreview(true);
    };

    const insertVariable = (variable: string) => {
        editor?.chain().focus().insertContent(variable).run();
    };

    const loadSnippet = (key: string) => {
        const html = TEMPLATE_SNIPPETS[key];
        if (html) editor?.commands.setContent(html);
    };

    const copyHtml = () => {
        const html = editor?.getHTML() ?? '';
        navigator.clipboard.writeText(html);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            order_confirmation: '訂單確認',
            shipping:           '出貨通知',
            promotional:        '行銷推廣',
            welcome:            '歡迎信',
            custom:             '自訂',
        };
        return labels[type] ?? type;
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
                        <p className="text-sm text-moon-muted">設計和管理訂單確認、推廣郵件等電子郵件模板</p>
                    </div>
                    <button
                        onClick={openCreate}
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
                        <button onClick={openCreate} className="text-moon-accent hover:underline">
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
                                            <h3 className="text-lg font-semibold text-moon-accent">{template.name}</h3>
                                            <span className="text-xs bg-moon-border text-moon-muted px-3 py-1 rounded">
                                                {getTypeLabel(template.type)}
                                            </span>
                                            {template.is_active && (
                                                <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded">
                                                    ✓ 啟用
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-moon-muted mb-2">主旨: {template.subject}</p>
                                        <div className="text-xs text-moon-muted space-y-1">
                                            <p>使用次數: {template.used_count}</p>
                                            {template.last_used && (
                                                <p>最後使用: {new Date(template.last_used).toLocaleDateString('zh-TW')}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openPreview(template.html_content, template.subject)}
                                            className="p-2 text-moon-muted hover:text-moon-accent transition-colors"
                                            title="預覽"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => openEdit(template)}
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

                {/* ── 編輯 Modal ── */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-moon-black border border-moon-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">

                            {/* Modal Header */}
                            <div className="sticky top-0 bg-moon-black border-b border-moon-border px-6 py-4 flex items-center justify-between z-10">
                                <h2 className="text-2xl font-semibold text-moon-accent">
                                    {editingTemplate ? '編輯模板' : '新增模板'}
                                </h2>
                                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-moon-border rounded-lg transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded text-sm flex items-center gap-2">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                {/* 名稱 + 類型 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-moon-accent mb-2">模板名稱 *</label>
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
                                        <label className="block text-sm font-semibold text-moon-accent mb-2">模板類型 *</label>
                                        <select
                                            value={form.type}
                                            onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
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

                                {/* 主旨 */}
                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">郵件主旨 *</label>
                                    <input
                                        type="text"
                                        value={form.subject}
                                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="例: 您的訂單已確認"
                                        required
                                    />
                                </div>

                                {/* 預覽文本 */}
                                <div>
                                    <label className="block text-sm font-semibold text-moon-accent mb-2">預覽文本（可選）</label>
                                    <input
                                        type="text"
                                        value={form.preview_text}
                                        onChange={(e) => setForm({ ...form, preview_text: e.target.value })}
                                        className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                                        placeholder="在收件人列表中顯示的預覽"
                                    />
                                </div>

                                {/* WYSIWYG 編輯器 */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-semibold text-moon-accent">郵件內容 *</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={copyHtml}
                                                className="flex items-center gap-1 text-xs text-moon-muted hover:text-moon-accent transition-colors px-2 py-1"
                                                title="複製 HTML"
                                            >
                                                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                <span>複製 HTML</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openPreview(editor?.getHTML() ?? '', form.subject)}
                                                className="flex items-center gap-1 text-xs text-moon-muted hover:text-moon-accent transition-colors px-2 py-1"
                                            >
                                                <Eye size={14} />
                                                <span>預覽</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 編輯器 */}
                                    <div className="border border-moon-border rounded overflow-hidden">
                                        <EditorToolbar editor={editor} />
                                        <div className="bg-moon-border/20">
                                            <EditorContent editor={editor} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-moon-muted mt-1">直接打字編輯內容，使用下方按鈕插入變數</p>

                                    {/* 變數插入面板 */}
                                    <div className="mt-4 p-4 bg-moon-border/20 rounded-lg border border-moon-border">
                                        <p className="text-sm font-semibold text-moon-accent mb-3">📌 插入變數</p>
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            {EMAIL_VARIABLES.map((v) => (
                                                <button
                                                    key={v.key}
                                                    type="button"
                                                    onClick={() => insertVariable(v.key)}
                                                    className="text-left text-xs bg-moon-black border border-moon-border px-3 py-2 rounded hover:border-moon-accent transition-colors"
                                                    title={v.desc}
                                                >
                                                    <code className="text-moon-accent font-semibold">{v.key}</code>
                                                    <p className="text-moon-muted mt-0.5">{v.label}</p>
                                                </button>
                                            ))}
                                        </div>

                                        <p className="text-sm font-semibold text-moon-accent mb-2">✨ MOONMOON 快速模板</p>
                                        <div className="flex gap-2 flex-wrap">
                                            <button
                                                type="button"
                                                onClick={() => loadSnippet('order_confirmation')}
                                                className="text-xs bg-moon-black border border-moon-border px-3 py-2 rounded hover:border-moon-accent transition-colors"
                                            >
                                                訂單確認
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => loadSnippet('ready_for_pickup')}
                                                className="text-xs bg-moon-black border border-moon-border px-3 py-2 rounded hover:border-moon-accent transition-colors"
                                            >
                                                可取貨通知
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => loadSnippet('cancelled')}
                                                className="text-xs bg-moon-black border border-moon-border px-3 py-2 rounded hover:border-moon-accent transition-colors"
                                            >
                                                訂單取消
                                            </button>
                                        </div>
                                    </div>
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
                                    <label htmlFor="is_active" className="text-sm text-moon-text">啟用此模板</label>
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

                {/* ── 預覽 Modal ── */}
                {showPreview && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-moon-black border border-moon-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-moon-black border-b border-moon-border px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-moon-accent">📧 郵件預覽</h2>
                                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-moon-border rounded-lg transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="bg-white rounded-lg overflow-hidden">
                                    {previewSubject && (
                                        <div className="px-6 py-4 border-b border-gray-200">
                                            <p className="text-sm text-gray-500">主旨</p>
                                            <p className="text-gray-900 font-semibold">{previewSubject}</p>
                                        </div>
                                    )}
                                    <div
                                        dangerouslySetInnerHTML={{ __html: previewHtml || '<p style="padding:20px;color:#666;">無內容</p>' }}
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
