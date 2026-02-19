'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Archive, ToggleRight, ToggleLeft, Search, Filter, Upload } from 'lucide-react';

interface MenuItem {
    id: string;
    name: string;
    category: string;
    description?: string;
    price: number;
    image_url?: string;
    is_active: boolean;
    variants?: { name: string; price: number }[];
    created_at: string;
}

export default function MenuAdminPage() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const fetchMenuItems = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/menu');
            if (!response.ok) throw new Error('Failed to fetch menu items');
            const data = await response.json();
            setItems(data.items || []);
            
            // 提取分類
            const cats = Array.from(new Set(data.items?.map((i: MenuItem) => i.category) || []));
            setCategories(cats as string[]);
        } catch (error) {
            console.error('載入菜單錯誤:', error);
            alert('載入菜單失敗');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/admin/menu/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus }),
            });

            if (!response.ok) throw new Error('Failed to toggle item');
            
            setItems(items.map(item =>
                item.id === id ? { ...item, is_active: !currentStatus } : item
            ));
        } catch (error) {
            console.error('更新品項錯誤:', error);
            alert('更新失敗');
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm('確定要刪除此品項嗎？')) return;

        try {
            const response = await fetch(`/api/admin/menu/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete item');
            
            setItems(items.filter(item => item.id !== id));
        } catch (error) {
            console.error('刪除品項錯誤:', error);
            alert('刪除失敗');
        }
    };

    const handleEdit = (item: MenuItem) => {
        setEditingItem(item);
        setShowForm(true);
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
                            🍰 菜單管理
                        </h1>
                        <p className="text-sm text-moon-muted">
                            管理所有商品、分類和庫存
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors"
                    >
                        <Plus size={20} />
                        新增商品
                    </button>
                </div>

                {/* 搜尋和篩選 */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-moon-muted" size={18} />
                        <input
                            type="text"
                            placeholder="搜尋商品名稱或描述..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-moon-dark border border-moon-border text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-3 text-moon-muted" size={18} />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-moon-dark border border-moon-border text-moon-text focus:outline-none focus:border-moon-accent appearance-none"
                        >
                            <option value="all">所有分類</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-sm text-moon-muted flex items-center">
                        共 {filteredItems.length} 件商品
                    </div>
                </div>

                {/* 商品列表 */}
                {filteredItems.length === 0 ? (
                    <div className="border border-moon-border p-12 text-center">
                        <p className="text-moon-muted mb-4">未找到符合條件的商品</p>
                        <button
                            onClick={() => {
                                setEditingItem(null);
                                setShowForm(true);
                            }}
                            className="text-moon-accent hover:underline"
                        >
                            新增第一個商品 →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className={`border border-moon-border bg-moon-dark/70 p-4 flex items-center justify-between gap-4 hover:border-moon-accent/50 transition-colors group ${!item.is_active ? 'opacity-60' : ''}`}
                            >
                                {/* 左側：圖片和基本資訊 */}
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    {item.image_url && (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="w-16 h-16 object-cover border border-moon-border/50"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-medium text-moon-text truncate">{item.name}</h3>
                                            <span className="text-xs bg-moon-border/50 text-moon-muted px-2 py-1 whitespace-nowrap">
                                                {item.category}
                                            </span>
                                        </div>
                                        {item.description && (
                                            <p className="text-sm text-moon-muted line-clamp-2">{item.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 text-sm">
                                            <span className="text-moon-accent font-medium">${item.price}</span>
                                            {item.variants && item.variants.length > 0 && (
                                                <span className="text-xs text-moon-muted">
                                                    +{item.variants.length} 規格
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 右側：操作按鈕 */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <button
                                        onClick={() => toggleActive(item.id, item.is_active)}
                                        className={`p-2 rounded transition-colors ${
                                            item.is_active
                                                ? 'text-green-400 hover:bg-green-400/10'
                                                : 'text-red-400 hover:bg-red-400/10'
                                        }`}
                                        title={item.is_active ? '下架' : '上架'}
                                    >
                                        {item.is_active ? (
                                            <ToggleRight size={20} />
                                        ) : (
                                            <ToggleLeft size={20} />
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-2 text-moon-muted hover:text-moon-accent hover:bg-moon-accent/10 rounded transition-colors"
                                        title="編輯"
                                    >
                                        <Edit2 size={18} />
                                    </button>

                                    <button
                                        onClick={() => deleteItem(item.id)}
                                        className="p-2 text-moon-muted hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                        title="刪除"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
