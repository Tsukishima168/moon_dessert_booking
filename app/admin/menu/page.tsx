'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, ToggleRight, ToggleLeft, X, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { SearchFilterBar } from '@/components/shared/search-filter-bar';

interface Variant {
    id?: string;
    variant_name: string;
    price: number;
}

// 配送方式（P0-2，對應 supabase/migrations/20260710000001_product_content_fields.sql 的 CHECK 值域）
type DeliveryType = '' | 'pickup_only' | 'delivery_ok' | 'both';

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
    // 電商內容欄位（P0-2）：DB 尚未套用 migration 時可能為 undefined
    tagline?: string | null;
    size_info?: string | null;
    ingredients?: string[] | null;
    allergens?: string[] | null;
    storage_info?: string | null;
    delivery_type?: DeliveryType | null;
    lead_time_days?: number | null;
    gallery_urls?: string[] | null;
    included_items?: string | null;
    available_from?: string | null;
    available_until?: string | null;
    slug?: string | null;
}

// 陣列欄位在表單內用「每行一個」的 textarea 呈現，存取時轉換
const arrayToLines = (arr?: string[] | null) => (arr && arr.length > 0 ? arr.join('\n') : '');
const linesToArray = (text: string): string[] | null => {
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
    return lines.length > 0 ? lines : null;
};

const optionalText = (text: string): string | null => text.trim() || null;

// ISO timestamp <-> <input type="datetime-local"> 的雙向轉換
const isoToDatetimeLocal = (iso?: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const datetimeLocalToIso = (value: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const isHttpsUrl = (value: string): boolean => {
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
};

const EMPTY_FORM = {
    name: '',
    category: '',
    description: '',
    price: 0,
    image_url: '',
    is_active: true,
    recommended: false,
    variants: [{ variant_name: '一般', price: 0 }] as Variant[],
    // 電商內容欄位（P0-2）
    tagline: '',
    size_info: '',
    ingredients: '',
    allergens: '',
    storage_info: '',
    delivery_type: '' as DeliveryType,
    lead_time_days: '',
    gallery_urls: '',
    included_items: '',
    available_from: '',
    available_until: '',
    slug: '',
};

export default function MenuAdminPage() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [categories, setCategories] = useState<string[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const fetchMenuItems = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await fetch('/api/admin/menu');
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `API 錯誤: ${response.status}`);
            }
            
            const list: MenuItem[] = data.items || [];
            setItems(list);
            
            // 自動提取分類
            const cats = Array.from(new Set(list.map((i) => i.category).filter(Boolean))) as string[];
            setCategories(cats);
            
            console.log(`✅ 成功載入 ${list.length} 件商品`);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : '無法載入菜單';
            console.error('載入菜單錯誤:', error);
            setError(errorMsg);
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
            tagline: item.tagline || '',
            size_info: item.size_info || '',
            ingredients: arrayToLines(item.ingredients),
            allergens: arrayToLines(item.allergens),
            storage_info: item.storage_info || '',
            delivery_type: (item.delivery_type || '') as DeliveryType,
            lead_time_days: item.lead_time_days != null ? String(item.lead_time_days) : '',
            gallery_urls: arrayToLines(item.gallery_urls),
            included_items: item.included_items || '',
            available_from: isoToDatetimeLocal(item.available_from),
            available_until: isoToDatetimeLocal(item.available_until),
            slug: item.slug || '',
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

        const slug = form.slug.trim().toLowerCase();
        if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            return alert('slug 只能使用小寫英數與單一連字號，例如 hokkaido-basque');
        }

        const leadTimeDays = form.lead_time_days === '' ? null : Number(form.lead_time_days);
        if (leadTimeDays !== null && (!Number.isInteger(leadTimeDays) || leadTimeDays < 0)) {
            return alert('預購前置天數必須是 0 以上的整數');
        }

        const galleryUrls = linesToArray(form.gallery_urls);
        if (galleryUrls?.some((url) => !isHttpsUrl(url))) {
            return alert('多圖網址必須是完整的 HTTPS URL');
        }

        const availableFrom = datetimeLocalToIso(form.available_from);
        const availableUntil = datetimeLocalToIso(form.available_until);
        if (availableFrom && availableUntil && availableFrom > availableUntil) {
            return alert('檔期截止時間不可早於檔期起始時間');
        }

        setSaving(true);
        try {
            const method = editingItem ? 'PUT' : 'POST';
            const url = editingItem ? `/api/admin/menu/${editingItem.id}` : '/api/admin/menu';
            const payload = {
                ...form,
                // 電商內容欄位（P0-2）：空值明確送 null，讓既有內容可以被清除；
                // 陣列欄位（每行一個）轉回 string[]
                tagline: optionalText(form.tagline),
                size_info: optionalText(form.size_info),
                ingredients: linesToArray(form.ingredients),
                allergens: linesToArray(form.allergens),
                storage_info: optionalText(form.storage_info),
                delivery_type: form.delivery_type || null,
                lead_time_days: leadTimeDays,
                gallery_urls: galleryUrls,
                included_items: optionalText(form.included_items),
                available_from: availableFrom,
                available_until: availableUntil,
                slug: slug || null,
            };
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.error || '儲存失敗');
            }
            await fetchMenuItems();
            setShowForm(false);
        } catch (error) {
            console.error('儲存錯誤:', error);
            alert(error instanceof Error ? error.message : '儲存失敗，請重試');
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
        return <LoadingState fullScreen text="載入菜單中..." className="bg-moon-black" />;
    }

    return (
        <div className="min-h-screen bg-moon-black">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                <PageHeader
                    title="菜單管理"
                    description="管理商品、分類、圖片與規格。"
                    meta={`${items.length} 件商品`}
                    action={(
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 bg-moon-accent text-moon-black px-5 py-2.5 text-sm tracking-wider hover:bg-moon-text transition-colors"
                        >
                            <Plus size={16} />
                            新增商品
                        </button>
                    )}
                />

                {/* 錯誤訊息 */}
                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 flex items-start gap-3">
                        <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-red-300 text-sm font-medium">載入錯誤</p>
                            <p className="text-red-200/70 text-xs mt-1">{error}</p>
                            <button
                                onClick={fetchMenuItems}
                                className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
                            >
                                重新嘗試
                            </button>
                        </div>
                    </div>
                )}

                <SearchFilterBar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder="搜尋商品名稱或描述"
                    filters={[
                        { value: 'all', label: '所有分類' },
                        ...categories.map((cat) => ({ value: cat, label: cat })),
                    ]}
                    activeFilter={categoryFilter}
                    onFilterChange={setCategoryFilter}
                />

                {/* 商品卡片 — 依分類分組 */}
                {Object.keys(grouped).length === 0 ? (
                    <EmptyState
                        title="沒有符合條件的商品"
                        description="可以先調整搜尋或分類，或直接新增新的商品。"
                        className="border-moon-border bg-moon-dark/30"
                        action={(
                            <button onClick={openCreate} className="text-moon-accent text-sm hover:underline">
                                新增第一個商品 →
                            </button>
                        )}
                    />
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
                                            onClick={() => openEdit(item)}
                                            className={`border border-moon-border bg-moon-dark/70 flex flex-col cursor-pointer hover:border-moon-accent/70 hover:bg-moon-dark transition-colors group ${!item.is_active ? 'opacity-50' : ''}`}
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
                                                    onClick={(e) => { e.stopPropagation(); toggleActive(item.id, item.is_active); }}
                                                    className={`p-1.5 rounded transition-colors ${item.is_active
                                                        ? 'text-green-400 hover:bg-green-400/10'
                                                        : 'text-red-400 hover:bg-red-400/10'
                                                        }`}
                                                    title={item.is_active ? '點擊下架' : '點擊上架'}
                                                >
                                                    {item.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                </button>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
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

                            {/* ===== 電商內容欄位（P0-2） ===== */}
                            <div className="pt-2 border-t border-moon-border/50">
                                <h3 className="text-xs text-moon-accent tracking-[0.2em] uppercase mb-3">
                                    商品內容（電商欄位）
                                </h3>
                            </div>

                            {/* 賣點副標 */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    賣點副標 tagline
                                </label>
                                <input
                                    type="text"
                                    value={form.tagline}
                                    onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                                    placeholder="例：北海道經典｜濃郁不膩口"
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 尺寸/份量 */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    尺寸/份量 size_info
                                </label>
                                <input
                                    type="text"
                                    value={form.size_info}
                                    onChange={(e) => setForm((f) => ({ ...f, size_info: e.target.value }))}
                                    placeholder="例：4吋，約2-3人份"
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 成分（多值） */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    成分 ingredients（每行一項）
                                </label>
                                <textarea
                                    value={form.ingredients}
                                    onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
                                    placeholder={'鮮奶油\n乳酪\n雞蛋'}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent resize-none"
                                />
                            </div>

                            {/* 過敏原（多值） */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    過敏原 allergens（每行一項）
                                </label>
                                <textarea
                                    value={form.allergens}
                                    onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))}
                                    placeholder={'乳製品\n蛋\n堅果'}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent resize-none"
                                />
                            </div>

                            {/* 保存方式/期限 */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    保存方式/期限 storage_info
                                </label>
                                <input
                                    type="text"
                                    value={form.storage_info}
                                    onChange={(e) => setForm((f) => ({ ...f, storage_info: e.target.value }))}
                                    placeholder="例：冷藏保存3日，食用前退冰10分鐘"
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 配送方式 + 預購前置天數 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                        配送方式 delivery_type
                                    </label>
                                    <select
                                        value={form.delivery_type}
                                        onChange={(e) => setForm((f) => ({ ...f, delivery_type: e.target.value as DeliveryType }))}
                                        className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                    >
                                        <option value="">未設定</option>
                                        <option value="pickup_only">限自取 pickup_only</option>
                                        <option value="delivery_ok">可宅配 delivery_ok</option>
                                        <option value="both">皆可 both</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                        預購前置天數 lead_time_days
                                    </label>
                                    <input
                                        type="number"
                                        value={form.lead_time_days}
                                        onChange={(e) => setForm((f) => ({ ...f, lead_time_days: e.target.value }))}
                                        placeholder="例：3"
                                        min={0}
                                        step={1}
                                        className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                    />
                                </div>
                            </div>

                            {/* 多圖網址（多值） */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    多圖網址 gallery_urls（每行一個 URL）
                                </label>
                                <textarea
                                    value={form.gallery_urls}
                                    onChange={(e) => setForm((f) => ({ ...f, gallery_urls: e.target.value }))}
                                    placeholder={'https://res.cloudinary.com/.../1.jpg\nhttps://res.cloudinary.com/.../2.jpg'}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent resize-none"
                                />
                            </div>

                            {/* 附贈品項 */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    附贈品項 included_items
                                </label>
                                <input
                                    type="text"
                                    value={form.included_items}
                                    onChange={(e) => setForm((f) => ({ ...f, included_items: e.target.value }))}
                                    placeholder="例：插卡、蠟燭、提袋"
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                />
                            </div>

                            {/* 檔期起訖 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                        檔期起始 available_from
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.available_from}
                                        onChange={(e) => setForm((f) => ({ ...f, available_from: e.target.value }))}
                                        className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                        檔期截止 available_until
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.available_until}
                                        onChange={(e) => setForm((f) => ({ ...f, available_until: e.target.value }))}
                                        className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                    />
                                </div>
                            </div>

                            {/* slug */}
                            <div>
                                <label className="block text-xs text-moon-muted tracking-wider mb-1">
                                    網址代稱 slug（供未來 /product/[slug]，須唯一）
                                </label>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                                    placeholder="例：hokkaido-basque-cheesecake"
                                    maxLength={100}
                                    className="w-full px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                                />
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
