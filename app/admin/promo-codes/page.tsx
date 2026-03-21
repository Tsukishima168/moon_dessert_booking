'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Percent, DollarSign, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { SearchFilterBar } from '@/components/shared/search-filter-bar';

interface PromoCode {
    id: string;
    code: string;
    description: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
    max_uses: number | null;
    used_count: number;
    is_active: boolean;
    valid_until: string | null;
}

export default function PromoCodesPage() {
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCode, setCurrentCode] = useState<Partial<PromoCode>>({});
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // 載入優惠碼
    const fetchCodes = async () => {
        try {
            const res = await fetch('/api/admin/promo-codes');
            const data = await res.json();
            if (Array.isArray(data)) {
                setPromoCodes(data);
            }
        } catch (err) {
            console.error('Failed to fetch promo codes', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCodes();
    }, []);

    // 儲存優惠碼
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const method = currentCode.id ? 'PUT' : 'POST';
            const res = await fetch('/api/admin/promo-codes', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentCode),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '儲存失敗');
            }

            setIsEditing(false);
            fetchCodes();
        } catch (err) {
            setError(err instanceof Error ? err.message : '儲存失敗');
        }
    };

    // 刪除優惠碼
    const handleDelete = async (id: string) => {
        if (!confirm('確定要刪除此優惠碼嗎？此動作無法復原。')) return;

        try {
            const res = await fetch(`/api/admin/promo-codes?id=${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('刪除失敗');

            fetchCodes();
        } catch (err) {
            alert('刪除失敗');
        }
    };

    // 開啟編輯
    const openEdit = (code?: PromoCode) => {
        if (code) {
            setCurrentCode(code);
        } else {
            setCurrentCode({
                code: '',
                discount_type: 'fixed',
                discount_value: 0,
                min_order_amount: 0,
                is_active: true,
            });
        }
        setIsEditing(true);
        setError('');
    };

    const filteredPromoCodes = promoCodes.filter((code) => {
        const matchesSearch = !searchTerm || [
            code.code,
            code.description,
        ].some((value) => value?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all'
            || (statusFilter === 'active' && code.is_active)
            || (statusFilter === 'inactive' && !code.is_active);
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return <LoadingState fullScreen text="載入優惠碼中..." className="bg-moon-black" />;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="優惠碼管理"
                description="管理折扣碼、啟用狀態與使用資訊。"
                icon={<Tag className="w-5 h-5" />}
                meta={`目前 ${filteredPromoCodes.length} 筆`}
                action={(
                    <button
                        onClick={() => openEdit()}
                        className="bg-moon-accent text-moon-black px-4 py-2 text-sm tracking-wider hover:bg-white transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        新增優惠碼
                    </button>
                )}
            />

            <SearchFilterBar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="搜尋優惠碼或描述"
                filters={[
                    { value: 'all', label: '全部' },
                    { value: 'active', label: '啟用中' },
                    { value: 'inactive', label: '已停用' },
                ]}
                activeFilter={statusFilter}
                onFilterChange={setStatusFilter}
            />

            {/* 優惠碼列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPromoCodes.map((code) => (
                    <div
                        key={code.id}
                        className={`border ${code.is_active ? 'border-moon-border' : 'border-red-900/30'} bg-moon-dark/50 p-6 relative group transition-all hover:border-moon-border/80`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col">
                                <span className={`text-xl font-bold tracking-wider ${code.is_active ? 'text-white' : 'text-moon-muted line-through'}`}>
                                    {code.code}
                                </span>
                                <span className="text-xs text-moon-muted mt-1">{code.description || '無描述'}</span>
                            </div>
                            <div className={`px-2 py-1 text-[10px] border ${code.is_active ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                                {code.is_active ? '啟用中' : '已停用'}
                            </div>
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-moon-accent">
                                {code.discount_type === 'percentage' ? <Percent size={14} /> : <DollarSign size={14} />}
                                <span className="text-lg font-light">
                                    {code.discount_type === 'percentage' ? `${100 - code.discount_value}折` : `折抵 $${code.discount_value}`}
                                </span>
                            </div>
                            <div className="text-xs text-moon-muted">
                                低消門檻: ${code.min_order_amount}
                            </div>
                            <div className="text-xs text-moon-muted">
                                已使用: {code.used_count} 次
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => openEdit(code)}
                                className="flex-1 border border-moon-border text-moon-muted hover:text-white py-2 text-xs flex items-center justify-center gap-2"
                            >
                                <Edit2 size={12} /> 編輯
                            </button>
                            <button
                                onClick={() => handleDelete(code.id)}
                                className="w-10 border border-moon-border text-moon-muted hover:text-red-400 py-2 flex items-center justify-center"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredPromoCodes.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            title={promoCodes.length === 0 ? '尚未建立任何優惠碼' : '沒有符合條件的優惠碼'}
                            description={promoCodes.length === 0 ? '可以先建立第一張折扣碼，之後再逐步擴充活動。' : '換個搜尋字或篩選條件，再試一次。'}
                            className="border-dashed border-moon-border/30 bg-transparent"
                        />
                    </div>
                )}
            </div>

            {/* 編輯 Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-moon-dark border border-moon-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl text-moon-accent mb-6">
                            {currentCode.id ? '編輯優惠碼' : '新增優惠碼'}
                        </h2>

                        {error && (
                            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 text-red-200 text-sm flex items-center gap-2">
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs text-moon-muted mb-1">優惠代碼 (自動轉大寫)</label>
                                <input
                                    type="text"
                                    value={currentCode.code}
                                    onChange={e => setCurrentCode({ ...currentCode, code: e.target.value.toUpperCase() })}
                                    className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-moon-muted mb-1">描述</label>
                                <input
                                    type="text"
                                    value={currentCode.description || ''}
                                    onChange={e => setCurrentCode({ ...currentCode, description: e.target.value })}
                                    className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-moon-muted mb-1">折扣類型</label>
                                    <select
                                        value={currentCode.discount_type}
                                        onChange={e => setCurrentCode({ ...currentCode, discount_type: e.target.value as any })}
                                        className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none"
                                    >
                                        <option value="fixed">定額折抵 ($)</option>
                                        <option value="percentage">百分比折扣 (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-moon-muted mb-1">
                                        {currentCode.discount_type === 'fixed' ? '折抵金額' : '折扣數值 (例: 12=88折)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={currentCode.discount_value}
                                        onChange={e => setCurrentCode({ ...currentCode, discount_value: Number(e.target.value) })}
                                        className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-moon-muted mb-1">最低消費金額 (0 為不限)</label>
                                <input
                                    type="number"
                                    value={currentCode.min_order_amount}
                                    onChange={e => setCurrentCode({ ...currentCode, min_order_amount: Number(e.target.value) })}
                                    className="w-full bg-moon-black border border-moon-border px-3 py-2 text-white focus:border-moon-accent outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={currentCode.is_active}
                                    onChange={e => setCurrentCode({ ...currentCode, is_active: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="isActive" className="text-sm text-white">啟用此優惠碼</label>
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 border border-moon-border text-moon-muted py-2 hover:bg-moon-border/20 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-moon-accent text-moon-black py-2 hover:bg-white transition-colors"
                                >
                                    儲存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
