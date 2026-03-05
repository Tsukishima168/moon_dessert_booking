'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, ToggleRight, ToggleLeft, Search, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import Image from 'next/image';

interface Variant {
    id?: string;
    variant_name: string;
    price: number;
}

interface MenuItem {
    id: string;
    name: string;
    category: string;
    description?: string;
    price: number;
    image_url?: string;
    is_active: boolean;
    is_available?: boolean;
    recommended?: boolean;
    variants?: Variant[];
    created_at: string;
}

const EMPTY_FORM = {
    name: '',
    category: '',
    description: '',
    price: 0,
    image_url: '',
    is_active: true,
    recommended: false,
    variants: [{ variant_name: '一般', price: 0 }] as Variant[],
};

export default function MenuAdminPage() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [categories, setCategories] = useState<string[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const fetchMenuItems = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/menu');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            const list: MenuItem[] = data.items || [];
            setItems(list);
            const cats = Array.from(new Set(list.map((i) => i.category).filter(Boolean))) as string[];
            setCategories(cats);
        } catch (error) {
            console.error('載入菜單錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter((item) => {
        const matchesSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // 分組
    const grouped: Record<string, MenuItem[]> = {};
    filteredItems.forEach((item) => {
        const cat = item.category || '未分類';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    const openCreate = () => {
        setEditingItem(null);
        setForm({ ...EMPTY_FORM });
        setShowForm(true);
    };

    const openEdit = (item: MenuItem) => {
        setEditingItem(item);
        setForm({
            name: item.name,
            category: item.category,
            description: item.description || '',
            price: item.price,
            image_url: item.image_url || '',
            is_active: item.is_active,
            recommended: item.recommended || false,
            variants: item.variants?.length
                ? item.variants.map((v) => ({ id: v.id, variant_name: v.variant_name, price: v.price }))
                : [{ variant_name: '一般', price: item.price }],
        });
        setShowForm(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('請選擇圖片檔案');
            return;
        }
        
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'moon-dessert/menu');
        
        try {
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '上傳失敗');
            }
            
            const data = await response.json();
            setForm({ ...form, image_url: data.url });
            alert('圖片上傳成功');
        } catch (error) {
            console.error('圖片上傳錯誤:', error);
            alert(`上傳失敗: ${error instanceof Error ? error.message : '請重試'}`);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.category) return alert('請填寫名稱和分類');
        setSaving(true);
        try {
            const method = editingItem ? 'PUT' : 'POST';
            const url = editingItem ? `/api/admin/menu/${editingItem.id}` : '/api/admin/menu';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!response.ok) throw new Error('Save failed');
            await fetchMenuItems();
            setShowForm(false);
        } catch (error) {
            console.error('儲存錯誤:', error);
            alert('儲存失敗，請重試');
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (id: string, current: boolean) => {
        try {
            await fetch(`/api/admin/menu/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !current }),
            });
            setItems(items.map((i) => (i.id === id ? { ...i, is_active: !current } : i)));
        } catch {
            alert('更新失敗');
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm('確定刪除此品項？')) return;
        try {
            await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' });
            setItems(items.filter((i) => i.id !== id));
        } catch {
            alert('刪除失敗');
        }
    };

    const addVariant = () =>
        setForm((f) => ({ ...f, variants: [...f.variants, { variant_name: '', price: 0 }] }));

    const removeVariant = (idx: number) =>
        setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));

    const updateVariant = (idx: number, field: 'variant_name' | 'price', value: string | number) =>
        setForm((f) => ({
            ...f,
            variants: f.variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)),
        }));

    if (loading) {
        return (
            <div className="min-h-screen bg-moon-black flex items-center justify-center">
                <Loader2 className="animate-spin text-moon-accent" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-moon-black">
            <AdminNav />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-light text-moon-accent tracking-wider">菜單管理</h1>
                        <p className="text-xs text-moon-muted mt-1">{items.length} 件商品</p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-moon-accent text-moon-black px-5 py-2.5 text-sm tracking-wider hover:bg-moon-text transition-colors"
                    >
                        <Plus size={16} />
                        新增商品
                    </button>
                </div>

                {/* 搜尋 + 篩選 */}
                <div className="mb-6 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-moon-muted" size={16} />
                        <input
                            type="text"
                            placeholder="搜尋商品..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-moon-dark border border-moon-border text-moon-text text-sm placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 bg-moon-dark border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                    >
                        <option value="all">所有分類</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* 商品卡片 — 依分類分組 */}
                {Object.keys(grouped).length === 0 ? (
                    <div className="border border-moon-border p-16 text-center">
                        <p className="text-moon-muted mb-4">沒有符合條件的商品</p>
                        <button onClick={openCreate} className="text-moon-accent text-sm hover:underline">
                            新增第一個商品 →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.entries(grouped).map(([cat, catItems]) => (
                            <div key={cat}>
                                {/* 分類標題 */}
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className="text-sm tracking-[0.2em] text-moon-muted uppercase">{cat}</h2>
                                    <div className="flex-1 h-px bg-moon-border/50" />
                                    <span className="text-xs text-moon-muted/60">{catItems.length}</span>
                                </div>

                                {/* 卡片 Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {catItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`border border-moon-border bg-moon-dark/70 flex flex-col hover:border-moon-accent/40 transition-colors ${!item.is_active ? 'opacity-50' : ''}`}
                                        >
                                            {/* 商品圖片 */}
                                            <div className="relative aspect-square bg-moon-gray overflow-hidden">
                                                {item.image_url ? (
                                                    <Image
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-moon-muted/20 text-3xl">
                                                        —
                                                    </div>
                                                )}
                                                {/* 狀態徽章 */}
                                                <div className="absolute top-2 left-2 flex gap-1">
                                                    {!item.is_active && (
                                                        <span className="text-[10px] bg-red-400/80 text-white px-1.5 py-0.5">
                                                            下架
                                                        </span>
                                                    )}
                                                    {item.recommended && (
                                                        <span className="text-[10px] bg-moon-accent/80 text-moon-black px-1.5 py-0.5">
                                                            推薦
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 商品資訊 */}
                                            <div className="p-3 flex-1 flex flex-col gap-1">
                                                <h3 className="text-sm text-moon-text leading-tight line-clamp-2">
                                                    {item.name}
                                                </h3>
                                                <p className="text-moon-accent text-sm font-light">
                                                    ${item.price}
                                                    {item.variants && item.variants.length > 1 && (
                                                        <span className="text-moon-muted text-xs ml-1">起</span>
                                                    )}
                                                </p>
                                                {item.variants && item.variants.length > 0 && (
                                                    <p className="text-[11px] text-moon-muted/60">
                                                        {item.variants.length} 種規格
                                                    </p>
                                                )}
                                            </div>

                                            {/* 操作列 */}
                                            <div className="border-t border-moon-border/50 p-2 flex items-center justify-between gap-1">
                                                <button
                                                    onClick={() => toggleActive(item.id, item.is_active)}
                                                    className={`p-1.5 rounded transition-colors ${item.is_active
                                                        ? 'text-green-400 hover:bg-green-400/10'
                                                        : 'text-red-400 hover:bg-red-400/10'
                                                        }`}
                                                    title={item.is_active ? '點擊下架' : '點擊上架'}
                                                >
                                                    {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                </button>

                                                <button
                                                    onClick={() => openEdit(item)}
                                                    className="p-1.5 text-moon-muted hover:text-moon-accent hover:bg-moon-accent/10 rounded transition-colors"
                                                    title="編輯"
                                                >
                                                    <Edit2 size={16} />
                                                </button>

                                                <button
                                                    onClick={() => deleteItem(item.id)}
                                                    className="p-1.5 text-moon-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                                    title="刪除"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* ===== 新增 / 編輯 表單 Modal ===== */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8 px-4">
                    <div className="w-full max-w-lg bg-moon-dark border border-moon-border shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-moon-border">
                            <h2 className="text-base tracking-wider text-moon-accent">
                                {editingItem ? '編輯商品' : '新增商品'}
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-moon-muted hover:text-moon-text transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="px-6 py-5 space-y-4">
                            {/* 名稱 */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    商品名稱 *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder="例：草莓塔"
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 分類 */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    分類 *
                                </label>
                                <input
                                    type="text"
                                    value={form.category}
                                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                                    placeholder="例：cake / 塔類 / 飲品"
                                    list="category-list"
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                />
                                <datalist id="category-list">
                                    {categories.map((c) => <option key={c} value={c} />)}
                                </datalist>
                            </div>

                            {/* 描述 */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    商品描述
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder="商品說明、食材、口感..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent resize-none"
                                />
                            </div>

                            {/* 基本售價 */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    基本售價（顯示用）
                                </label>
                                <input
                                    type="number"
                                    value={form.price}
                                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                                    min={0}
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 圖片 URL */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-2">
                                    圖片（Cloudinary）
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={form.image_url}
                                        onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                                        placeholder="https://res.cloudinary.com/..."
                                        className="flex-1 px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                    />
                                    <div className="relative">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploadingImage}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            className="px-3 py-2 bg-moon-accent text-moon-black font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                        >
                                            {uploadingImage ? '上傳中...' : '上傳圖片'}
                                        </button>
                                    </div>
                                </div>
                                {form.image_url && (
                                    <div className="mt-2 w-20 h-20 border border-moon-border overflow-hidden">
                                        <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            {/* 狀態開關 */}
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                                        className="accent-moon-accent w-4 h-4"
                                    />
                                    <span className="text-sm text-moon-muted">上架販售</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.recommended}
                                        onChange={(e) => setForm((f) => ({ ...f, recommended: e.target.checked }))}
                                        className="accent-moon-accent w-4 h-4"
                                    />
                                    <span className="text-sm text-moon-muted">推薦商品</span>
                                </label>
                            </div>

                            {/* 規格 */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs text-moon-muted tracking-wider">規格 / 尺寸</label>
                                    <button
                                        onClick={addVariant}
                                        type="button"
                                        className="text-xs text-moon-accent hover:underline flex items-center gap-1"
                                    >
                                        <Plus size={12} /> 新增規格
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {form.variants.map((v, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={v.variant_name}
                                                onChange={(e) => updateVariant(idx, 'variant_name', e.target.value)}
                                                placeholder="規格名（例：4吋）"
                                                className="flex-1 px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                            />
                                            <input
                                                type="number"
                                                value={v.price}
                                                onChange={(e) => updateVariant(idx, 'price', Number(e.target.value))}
                                                placeholder="價格"
                                                min={0}
                                                className="w-24 px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                            />
                                            {form.variants.length > 1 && (
                                                <button
                                                    onClick={() => removeVariant(idx)}
                                                    type="button"
                                                    className="p-2 text-moon-muted hover:text-red-400 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Form Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-moon-border">
                            <button
                                onClick={() => setShowForm(false)}
                                className="px-5 py-2 border border-moon-border text-moon-muted text-sm hover:border-moon-muted transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-moon-accent text-moon-black text-sm tracking-wider hover:bg-moon-text transition-colors disabled:opacity-60"
                            >
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                {editingItem ? '儲存變更' : '建立商品'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
