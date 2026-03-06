'use client';

import { useEffect, useState } from 'react';
import { Edit2, Save, X, Plus, Trash2, Calendar, Clock, AlertCircle, CheckCircle2, Search } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
}

interface Availability {
  id: string;
  menu_item_id: string;
  is_available: boolean;
  available_from: string | null;
  available_until: string | null;
  unavailable_dates: string[];
  available_weekdays: string[];
  min_advance_hours: number;
  notes: string | null;
}

const WEEKDAYS = [
  { value: '1', label: '週一' },
  { value: '2', label: '週二' },
  { value: '3', label: '週三' },
  { value: '4', label: '週四' },
  { value: '5', label: '週五' },
  { value: '6', label: '週六' },
  { value: '0', label: '週日' },
];

export default function MenuAvailabilityPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [availabilities, setAvailabilities] = useState<Map<string, Availability>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Availability>>({});
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [itemsRes, availRes] = await Promise.all([
        fetch('/api/admin/menu'),
        fetch('/api/admin/menu-availability'),
      ]);

      if (!itemsRes.ok || !availRes.ok) throw new Error('Failed to fetch');

      const itemsData = await itemsRes.json();
      const availData = await availRes.json();

      setMenuItems(itemsData.items || []);

      const map = new Map();
      (availData || []).forEach((a: Availability) => {
        map.set(a.menu_item_id, a);
      });
      setAvailabilities(map);
    } catch (error) {
      console.error('載入錯誤:', error);
      setError('載入失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (menuItemId: string) => {
    const avail = availabilities.get(menuItemId) || {
      menu_item_id: menuItemId,
      is_available: true,
      available_from: null,
      available_until: null,
      unavailable_dates: [],
      available_weekdays: ['1', '2', '3', '4', '5'],
      min_advance_hours: 24,
      notes: '',
    };
    setFormData({ ...avail });
    setEditingId(menuItemId);
  };

  const handleSave = async () => {
    if (!editingId) return;

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/menu-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_item_id: editingId,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error('Save failed');

      await fetchData();
      setEditingId(null);
      setFormData({});
    } catch (error) {
      console.error('保存錯誤:', error);
      setError('保存失敗，請重試');
    } finally {
      setSaving(false);
    }
  };

  const addUnavailableDate = (date: string) => {
    const dates = formData.unavailable_dates || [];
    if (!dates.includes(date)) {
      setFormData({
        ...formData,
        unavailable_dates: [...dates, date].sort(),
      });
    }
  };

  const removeUnavailableDate = (date: string) => {
    const dates = formData.unavailable_dates || [];
    setFormData({
      ...formData,
      unavailable_dates: dates.filter((d) => d !== date),
    });
  };

  const toggleWeekday = (value: string) => {
    const weekdays = formData.available_weekdays || [];
    if (weekdays.includes(value)) {
      setFormData({
        ...formData,
        available_weekdays: weekdays.filter((w) => w !== value),
      });
    } else {
      setFormData({
        ...formData,
        available_weekdays: [...weekdays, value].sort(),
      });
    }
  };

  const toggleAllWeekdays = (select: boolean) => {
    setFormData({
      ...formData,
      available_weekdays: select ? ['0', '1', '2', '3', '4', '5', '6'] : [],
    });
  };

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-moon-dark flex items-center justify-center">
        <div className="text-moon-muted">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-moon-dark p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-moon-accent tracking-wider mb-2">
            📅 菜單可用性設置
          </h1>
          <p className="text-sm text-moon-muted">
            設置每個商品的可用日期、時間和數量限制
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded mb-6 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* 搜尋 */}
        <div className="mb-6 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-moon-muted" />
          <input
            type="text"
            placeholder="搜尋商品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-moon-border/50 border border-moon-border px-4 py-3 pl-10 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
          />
        </div>

        {/* 商品列表 */}
        <div className="grid gap-4">
          {filteredItems.length === 0 ? (
            <div className="border border-moon-border p-12 text-center rounded-lg">
              <p className="text-moon-muted">未找到商品</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const avail = availabilities.get(item.id);
              const isEditing = editingId === item.id;

              if (isEditing) {
                return (
                  <div
                    key={item.id}
                    className="bg-moon-black border-2 border-moon-accent rounded-lg p-6"
                  >
                    <h3 className="text-lg font-semibold text-moon-accent mb-4">
                      編輯: {item.name}
                    </h3>

                    <div className="space-y-6">
                      {/* 啟用狀態 */}
                      <div>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={formData.is_available ?? true}
                            onChange={(e) =>
                              setFormData({ ...formData, is_available: e.target.checked })
                            }
                            className="w-5 h-5 accent-moon-accent"
                          />
                          <span className="text-moon-text font-semibold">
                            {formData.is_available ? '✓ 此商品可訂購' : '✗ 此商品暫不可訂購'}
                          </span>
                        </label>
                      </div>

                      {/* 周期性可用性 */}
                      <div>
                        <label className="block text-sm font-semibold text-moon-accent mb-3">
                          📅 可用日期 (每周)
                        </label>
                        <div className="flex gap-2 mb-2 mb-3">
                          <button
                            type="button"
                            onClick={() => toggleAllWeekdays(true)}
                            className="text-xs px-3 py-1 bg-moon-border hover:bg-moon-accent hover:text-moon-black rounded transition-colors"
                          >
                            全選
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAllWeekdays(false)}
                            className="text-xs px-3 py-1 bg-moon-border hover:bg-red-500 hover:text-moon-black rounded transition-colors"
                          >
                            清空
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {WEEKDAYS.map((day) => (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleWeekday(day.value)}
                              className={`py-3 px-2 rounded text-center font-semibold transition-colors ${
                                (formData.available_weekdays || []).includes(day.value)
                                  ? 'bg-moon-accent text-moon-black'
                                  : 'bg-moon-border text-moon-muted hover:text-moon-text'
                              }`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 可用時間 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-moon-accent mb-2">
                            ⏰ 開放時間
                          </label>
                          <input
                            type="time"
                            value={formData.available_from || '09:00'}
                            onChange={(e) =>
                              setFormData({ ...formData, available_from: e.target.value })
                            }
                            className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text focus:outline-none focus:border-moon-accent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-moon-accent mb-2">
                            🔚 關閉時間
                          </label>
                          <input
                            type="time"
                            value={formData.available_until || '20:00'}
                            onChange={(e) =>
                              setFormData({ ...formData, available_until: e.target.value })
                            }
                            className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text focus:outline-none focus:border-moon-accent"
                          />
                        </div>
                      </div>

                      {/* 預訂提前時數 */}
                      <div>
                        <label className="block text-sm font-semibold text-moon-accent mb-2">
                          📌 提前預訂時數
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.min_advance_hours ?? 24}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              min_advance_hours: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text focus:outline-none focus:border-moon-accent"
                        />
                        <p className="text-xs text-moon-muted mt-1">
                          顧客需要提前至少多少小時預訂
                        </p>
                      </div>

                      {/* 黑名單日期 */}
                      <div>
                        <label className="block text-sm font-semibold text-moon-accent mb-2">
                          🚫 不可用日期 (黑名單)
                        </label>
                        <div className="flex gap-2 mb-3">
                          <input
                            type="date"
                            id={`date-${item.id}`}
                            className="flex-1 bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text focus:outline-none focus:border-moon-accent"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const dateInput = document.getElementById(`date-${item.id}`) as HTMLInputElement;
                              if (dateInput.value) {
                                addUnavailableDate(dateInput.value);
                                dateInput.value = '';
                              }
                            }}
                            className="px-4 py-2 bg-moon-accent text-moon-black hover:bg-moon-text rounded transition-colors font-semibold"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(formData.unavailable_dates || []).map((date) => (
                            <div
                              key={date}
                              className="flex items-center justify-between bg-red-500/10 border border-red-500/30 px-3 py-2 rounded"
                            >
                              <span className="text-red-400">{date}</span>
                              <button
                                type="button"
                                onClick={() => removeUnavailableDate(date)}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 備註 */}
                      <div>
                        <label className="block text-sm font-semibold text-moon-accent mb-2">
                          📝 備註 (可選)
                        </label>
                        <textarea
                          value={formData.notes || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value || null })
                          }
                          className="w-full bg-moon-border/50 border border-moon-border px-4 py-2 rounded text-moon-text placeholder-moon-muted focus:outline-none focus:border-moon-accent"
                          placeholder="例: 週末可能需要更多時間準備"
                          rows={3}
                        />
                      </div>

                      {/* 按鈕 */}
                      <div className="flex gap-2 pt-4 border-t border-moon-border">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setFormData({});
                          }}
                          className="flex-1 px-4 py-2 bg-moon-border text-moon-text hover:bg-moon-border/50 rounded transition-colors"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 px-4 py-2 bg-moon-accent text-moon-black hover:bg-moon-text rounded transition-colors disabled:opacity-50 font-semibold"
                        >
                          {saving ? '保存中...' : '保存'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="bg-moon-black border border-moon-border rounded-lg p-6 hover:border-moon-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-moon-accent">
                          {item.name}
                        </h3>
                        {avail?.is_available ? (
                          <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded">
                            ✓ 可訂購
                          </span>
                        ) : (
                          <span className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded">
                            ✗ 停止銷售
                          </span>
                        )}
                      </div>

                      {avail && (
                        <div className="text-sm text-moon-muted space-y-1">
                          <p>
                            📅 可用日: {avail.available_weekdays?.length > 0
                              ? avail.available_weekdays
                                  .map((d) => WEEKDAYS.find((w) => w.value === d)?.label)
                                  .join(', ')
                              : '無'}
                          </p>
                          {avail.available_from && avail.available_until && (
                            <p>
                              ⏰ 時間: {avail.available_from} - {avail.available_until}
                            </p>
                          )}
                          <p>📌 提前預訂: {avail.min_advance_hours} 小時</p>
                          {avail.unavailable_dates?.length > 0 && (
                            <p>
                              🚫 黑名單: {avail.unavailable_dates.length} 個日期
                            </p>
                          )}
                          {avail.notes && <p className="text-xs">📝 {avail.notes}</p>}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => startEdit(item.id)}
                      className="p-2 text-moon-muted hover:text-moon-accent transition-colors"
                    >
                      <Edit2 size={20} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
