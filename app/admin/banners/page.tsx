'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Edit, Trash2, BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { SearchFilterBar } from '@/components/shared/search-filter-bar';

interface Banner {
    id: string;
    title: string;
    description?: string;
    image_url?: string;
    link_url?: string;
    link_text?: string;
    background_color: string;
    text_color: string;
    is_active: boolean;
    priority: number;
    display_type: 'hero' | 'announcement';
    start_date?: string;
    end_date?: string;
    view_count: number;
    click_count: number;
    created_at: string;
    updated_at: string;
}

export default function BannersAdminPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const response = await fetch('/api/admin/banners');
            if (!response.ok) throw new Error('Failed to fetch banners');
            const data = await response.json();
            setBanners(data);
        } catch (error) {
            console.error('取得 Banner 錯誤:', error);
            alert('載入 Banner 失敗');
        } finally {
            setLoading(false);
        }
    };

    const toggleActive = async (banner: Banner) => {
        try {
            const response = await fetch('/api/admin/banners', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: banner.id,
                    is_active: !banner.is_active,
                }),
            });

            if (!response.ok) throw new Error('Failed to update banner');

            await fetchBanners();
        } catch (error) {
            console.error('更新 Banner 錯誤:', error);
            alert('更新失敗');
        }
    };

    const deleteBanner = async (id: string) => {
        if (!confirm('確定要刪除此 Banner?')) return;

        try {
            const response = await fetch(`/api/admin/banners?id=${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete banner');

            await fetchBanners();
        } catch (error) {
            console.error('刪除 Banner 錯誤:', error);
            alert('刪除失敗');
        }
    };

    const handleEdit = (banner: Banner) => {
        setEditingBanner(banner);
        setShowForm(true);
    };

    const handleCreate = () => {
        setEditingBanner(null);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingBanner(null);
        fetchBanners();
    };

    const filteredBanners = banners.filter((banner) => {
        const matchesSearch = !searchTerm || [
            banner.title,
            banner.description,
            banner.link_text,
        ].some((value) => value?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all'
            || (statusFilter === 'active' && banner.is_active)
            || (statusFilter === 'inactive' && !banner.is_active);
        return matchesSearch && matchesStatus;
    });

    const activeCount = banners.filter(banner => banner.is_active).length;
    const inactiveCount = banners.length - activeCount;
    const heroCount = banners.filter(banner => banner.display_type === 'hero').length;
    const announcementCount = banners.filter(banner => banner.display_type === 'announcement').length;

    if (loading) {
        return <LoadingState fullScreen text="載入 Banner 中..." className="bg-moon-black" />;
    }

    return (
        <div className="min-h-screen bg-moon-black p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <PageHeader
                    title="Banner 管理"
                    description="管理首頁 Banner 與促銷露出。"
                    meta={`目前 ${filteredBanners.length} 筆`}
                    action={(
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors"
                        >
                            <Plus size={20} />
                            新增 Banner
                        </button>
                    )}
                />

                <SearchFilterBar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder="搜尋 Banner 標題或描述"
                    filters={[
                        { value: 'all', label: '全部' },
                        { value: 'active', label: '啟用中' },
                        { value: 'inactive', label: '已停用' },
                    ]}
                    activeFilter={statusFilter}
                    onFilterChange={setStatusFilter}
                />

                <div className="grid gap-4 md:grid-cols-4">
                    <BannerSummaryCard
                        label="前台顯示中"
                        value={`${activeCount} 筆`}
                        description={activeCount > 0 ? '至少會顯示 1 個 active Banner' : '目前前台不會顯示任何 Banner'}
                    />
                    <BannerSummaryCard
                        label="已關閉"
                        value={`${inactiveCount} 筆`}
                        description="這些 Banner 會保留在後台，但前台不會看到"
                    />
                    <BannerSummaryCard
                        label="Hero Banner"
                        value={`${heroCount} 筆`}
                        description="大型主視覺橫幅"
                    />
                    <BannerSummaryCard
                        label="公告條"
                        value={`${announcementCount} 筆`}
                        description="頂部簡短提示用"
                    />
                </div>

                {/* Banner List */}
                {filteredBanners.length === 0 ? (
                    <EmptyState
                        title={banners.length === 0 ? '尚無 Banner' : '沒有符合條件的 Banner'}
                        description={banners.length === 0 ? '如果你暫時不想在首頁放任何橫幅，也可以維持空白。' : '可以調整搜尋字或篩選條件再試一次。'}
                        className="border-moon-border bg-moon-dark/20"
                        action={banners.length === 0 ? (
                            <button
                                onClick={handleCreate}
                                className="text-moon-accent hover:underline"
                            >
                                建立第一個 Banner →
                            </button>
                        ) : undefined}
                    />
                ) : (
                    <div className="space-y-4">
                        {filteredBanners.map((banner) => (
                            <BannerCard
                                key={banner.id}
                                banner={banner}
                                onToggleActive={() => toggleActive(banner)}
                                onEdit={() => handleEdit(banner)}
                                onDelete={() => deleteBanner(banner.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <BannerForm
                    banner={editingBanner}
                    onClose={handleFormClose}
                />
            )}
        </div>
    );
}

// Banner Card Component
function BannerCard({
    banner,
    onToggleActive,
    onEdit,
    onDelete,
}: {
    banner: Banner;
    onToggleActive: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const isExpired = banner.end_date && new Date(banner.end_date) < new Date();
    const isScheduled = banner.start_date && new Date(banner.start_date) > new Date();
    const ctr = banner.view_count > 0
        ? ((banner.click_count / banner.view_count) * 100).toFixed(1)
        : '0';
    const visibilityLabel = banner.is_active ? '顯示中' : '已關閉';
    const visibilityTone = banner.is_active
        ? 'border-green-500/30 bg-green-500/10 text-green-400'
        : 'border-moon-border bg-moon-border/10 text-moon-muted';

    return (
        <div className="border border-moon-border bg-moon-dark/30 p-6">
            <div className="flex items-start gap-6">
                {/* Preview */}
                <div
                    className="flex-shrink-0 w-16 h-16 border border-moon-border overflow-hidden"
                    style={{ backgroundColor: `${banner.background_color}20` }}
                >
                    {banner.image_url ? (
                        <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                            {banner.display_type === 'hero' ? '🎯' : '📢'}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title & Status */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg text-moon-text font-light">
                                    {banner.title}
                                </h3>
                                <span className={`border px-2 py-1 text-xs ${visibilityTone}`}>
                                    {visibilityLabel}
                                </span>
                                {isExpired && (
                                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30">
                                        已過期
                                    </span>
                                )}
                                {isScheduled && (
                                    <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        排程中
                                    </span>
                                )}
                            </div>
                            {banner.description && (
                                <p className="text-sm text-moon-muted mb-2">
                                    {banner.description}
                                </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-moon-muted/60">
                                <span>模式: {banner.display_type === 'hero' ? 'Hero' : '公告條'}</span>
                                <span>優先級: {banner.priority}</span>
                                {banner.start_date && (
                                    <span>開始: {new Date(banner.start_date).toLocaleDateString()}</span>
                                )}
                                {banner.end_date && (
                                    <span>結束: {new Date(banner.end_date).toLocaleDateString()}</span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onToggleActive}
                                className={`inline-flex items-center gap-2 border px-3 py-2 text-sm transition-colors ${
                                    banner.is_active
                                        ? 'border-red-500/30 text-red-300 hover:bg-red-500/10'
                                        : 'border-green-500/30 text-green-300 hover:bg-green-500/10'
                                }`}
                                title={banner.is_active ? '停用 Banner' : '啟用 Banner'}
                            >
                                {banner.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                                {banner.is_active ? '關閉顯示' : '立即顯示'}
                            </button>
                            <button
                                onClick={onEdit}
                                className="inline-flex items-center gap-2 border border-moon-border px-3 py-2 text-sm hover:bg-moon-border/20 transition-colors"
                                title="編輯"
                            >
                                <Edit size={16} />
                                編輯
                            </button>
                            <button
                                onClick={onDelete}
                                className="inline-flex items-center gap-2 border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                title="刪除"
                            >
                                <Trash2 size={16} />
                                刪除
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-moon-muted">
                        {banner.is_active
                            ? '這筆 Banner 目前有資格出現在前台；若同時有多筆 active，會依優先級排序只顯示第一筆。'
                            : '這筆 Banner 目前只保留在後台，不會出現在前台。'}
                    </p>

                    {/* Statistics */}
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-moon-border/30">
                        <div className="flex items-center gap-2 text-sm">
                            <BarChart3 size={16} className="text-moon-muted" />
                            <span className="text-moon-muted">顯示:</span>
                            <span className="text-moon-text">{banner.view_count}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-moon-muted">點擊:</span>
                            <span className="text-moon-text">{banner.click_count}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-moon-muted">CTR:</span>
                            <span className="text-moon-accent">{ctr}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Banner Form Component
function BannerForm({
    banner,
    onClose,
}: {
    banner: Banner | null;
    onClose: () => void;
}) {
    const [formData, setFormData] = useState({
        title: banner?.title || '',
        description: banner?.description || '',
        image_url: banner?.image_url || '',
        link_url: banner?.link_url || '',
        link_text: banner?.link_text || '立即查看',
        background_color: banner?.background_color || '#d4a574',
        text_color: banner?.text_color || '#0a0a0a',
        is_active: banner?.is_active || false,
        priority: banner?.priority || 100,
        display_type: banner?.display_type || 'hero',
        start_date: banner?.start_date ? banner.start_date.slice(0, 16) : '',
        end_date: banner?.end_date ? banner.end_date.slice(0, 16) : '',
    });

    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = '/api/admin/banners';
            const method = banner ? 'PUT' : 'POST';
            const body = banner
                ? { id: banner.id, ...formData }
                : formData;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error('Failed to save banner');

            onClose();
        } catch (error) {
            console.error('儲存 Banner 錯誤:', error);
            alert('儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-moon-dark border border-moon-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-8">
                    <h2 className="text-xl text-moon-accent font-light tracking-wider mb-6">
                        {banner ? '編輯 Banner' : '新增 Banner'}
                    </h2>

                    {/* 基本資訊 */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm text-moon-muted mb-2">
                                標題 <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                                placeholder="例如: 🌹 情人節限定 - 草莓塔 85折"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-moon-muted mb-2">描述</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent resize-none"
                                rows={2}
                                placeholder="例如: 2/14 前預訂享優惠,數量有限"
                            />
                        </div>

                        {/* 圖片 URL */}
                        <div>
                            <label className="block text-sm text-moon-muted mb-2">圖片 URL（選填）</label>
                            <input
                                type="text"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                                placeholder="https://res.cloudinary.com/..."
                            />
                            {formData.image_url && (
                                <div className="mt-2 h-24 border border-moon-border/50 overflow-hidden">
                                    <img
                                        src={formData.image_url}
                                        alt="preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-moon-muted mb-2">連結 URL</label>
                                <input
                                    type="text"
                                    value={formData.link_url}
                                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                                    className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                                    placeholder="/"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-moon-muted mb-2">按鈕文字</label>
                                <input
                                    type="text"
                                    value={formData.link_text}
                                    onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                                    className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                                    placeholder="立即查看"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 樣式設定 */}
                    <div className="space-y-4 mb-6 pb-6 border-b border-moon-border">
                        <div className="rounded border border-moon-border/60 bg-moon-black/40 px-4 py-3 text-sm text-moon-muted">
                            若全部 Banner 都關閉，前台首頁就不會顯示任何橫幅。
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-moon-muted mb-2">背景色</label>
                                <input
                                    type="color"
                                    value={formData.background_color}
                                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                                    className="w-full h-12 bg-moon-black border border-moon-border cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-moon-muted mb-2">文字色</label>
                                <input
                                    type="color"
                                    value={formData.text_color}
                                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                                    className="w-full h-12 bg-moon-black border border-moon-border cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-moon-muted mb-2">優先級</label>
                                <input
                                    type="number"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                    className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-moon-muted mb-2">顯示類型</label>
                                <select
                                    value={formData.display_type}
                                    onChange={(e) => setFormData({ ...formData, display_type: e.target.value as 'hero' | 'announcement' })}
                                    className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                                >
                                    <option value="hero">Hero Banner（大型橫幅）</option>
                                    <option value="announcement">Announcement（頂部公告）</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-3 cursor-pointer rounded border border-moon-border px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-5 h-5"
                                    />
                                    <div>
                                        <p className="text-moon-text">立即顯示</p>
                                        <p className="text-xs text-moon-muted">打開後才會進入前台排序</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 時間排程 */}
                    <div className="space-y-4 mb-6">
                        <h3 className="text-sm text-moon-accent">時間排程 (選填)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-moon-muted mb-2">開始時間</label>
                                <input
                                    type="datetime-local"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-moon-muted mb-2">結束時間</label>
                                <input
                                    type="datetime-local"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-moon-muted/60">
                            留空表示立即開始或永久顯示
                        </p>
                    </div>

                    {/* Preview */}
                    <div className="mb-6 pb-6 border-b border-moon-border">
                        <h3 className="text-sm text-moon-accent mb-3">預覽</h3>
                        <div
                            className="border overflow-hidden"
                            style={{
                                backgroundColor: `${formData.background_color}10`,
                                borderColor: formData.background_color,
                            }}
                        >
                            {/* 圖片預覽 */}
                            {formData.image_url && (
                                <div className="w-full h-32 overflow-hidden">
                                    <img
                                        src={formData.image_url}
                                        alt="banner"
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                            )}
                            <div className="p-6">
                                <h4
                                    className="text-lg tracking-wider mb-2"
                                    style={{ color: formData.text_color }}
                                >
                                    {formData.title || '標題預覽'}
                                </h4>
                                {formData.description && (
                                    <p
                                        className="text-sm mb-3 opacity-90"
                                        style={{ color: formData.text_color }}
                                    >
                                        {formData.description}
                                    </p>
                                )}
                                {formData.link_url && (
                                    <button
                                        type="button"
                                        className="px-6 py-2 border"
                                        style={{
                                            backgroundColor: formData.background_color,
                                            color: formData.text_color === '#0a0a0a' ? '#ffffff' : '#0a0a0a',
                                            borderColor: formData.background_color,
                                        }}
                                    >
                                        {formData.link_text} →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border border-moon-border text-moon-text hover:bg-moon-border/20 transition-colors"
                            disabled={saving}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-3 bg-moon-accent text-moon-black hover:bg-moon-text transition-colors disabled:opacity-50"
                            disabled={saving}
                        >
                            {saving ? '儲存中...' : banner ? '更新' : '建立'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function BannerSummaryCard({
    label,
    value,
    description,
}: {
    label: string;
    value: string;
    description: string;
}) {
    return (
        <div className="border border-moon-border bg-moon-dark/30 p-4">
            <p className="text-xs tracking-widest text-moon-muted">{label}</p>
            <p className="mt-2 text-2xl font-light text-moon-accent">{value}</p>
            <p className="mt-2 text-xs leading-relaxed text-moon-muted">{description}</p>
        </div>
    );
}
