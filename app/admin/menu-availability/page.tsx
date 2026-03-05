'use client';

import { useEffect, useState } from 'react';
import { Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import AdminNav from '@/components/AdminNav';

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

export default function AvailabilityPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [availabilities, setAvailabilities] = useState<Map<string, Availability>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Availability>>({});
  const [saving, setSaving] = useState(false);

  const WEEKDAYS = [
    { value: '0', label: '週日' },
    { value: '1', label: '週一' },
    { value: '2', label: '週二' },
    { value: '3', label: '週三' },
    { value: '4', label: '週四' },
    { value: '5', label: '週五' },
    { value: '6', label: '週六' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
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
      alert('載入失敗');
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
      available_weekdays: ['0', '1', '2', '3', '4', '5', '6'],
      min_advance_hours: 24,
      notes: '',
    };
    setFormData(avail);
    setEditingId(menuItemId);
  };

  const handleSave = async () => {
    if (!editingId) return;

    setSaving(true);
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

      const saved = await response.json();
      setAvailabilities(prev => new Map(prev).set(editingId, saved));
      setEditingId(null);
      setFormData({});
    } catch (error) {
      console.error('儲存錯誤:', error);
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUnavailableDate = (dateStr: string) => {
    if (!dateStr) return;
    setFormData(prev => ({
      ...prev,
      unavailable_dates: [...(prev.unavailable_dates || []), dateStr],
    }));
  };

  const handleRemoveUnavailableDate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      unavailable_dates: prev.unavailable_dates?.filter((_, i) => i !== index) || [],
    }));
  };

  const toggleWeekday = (weekday: string) => {
    const current = formData.available_weekdays || [];
    const updated = current.includes(weekday)
      ? current.filter(w => w !== weekday)
      : [...current, weekday];
    setFormData(prev => ({
      ...prev,
      available_weekdays: updated,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-moon-dark">
        <p className="text-moon-accent">載入中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-moon-dark">
      <AdminNav />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-light tracking-wider text-moon-accent mb-8">
          🗓️ 菜單項目可用日期設定
        </h1>

        {/* 說明 */}
        <div className="bg-moon-black border border-moon-border rounded-lg p-4 mb-6 text-sm text-moon-muted">
          <p>• <strong>整體狀態</strong>：啟用或停止整個菜單項目的預訂</p>
          <p>• <strong>日期範圍</strong>：限制可預訂的起迄日期</p>
          <p>• <strong>黑名單日期</strong>：設定材料用盡或不提供的特定日期</p>
          <p>• <strong>可用週幾</strong>：選擇可提供服務的日子</p>
          <p>• <strong>最少預訂時間</strong>：預訂至交付的最短時間（小時）</p>
        </div>

        {/* 菜單項目清單 */}
        <div className="space-y-4">
          {menuItems.map(item => {
            const avail = availabilities.get(item.id);
            const isEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-moon-black border border-moon-border p-6 rounded-lg"
              >
                {isEditing ? (
                  // 編輯模式
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-moon-accent">{item.name}</h3>
                        <p className="text-xs text-moon-muted">{item.category}</p>
                      </div>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-moon-muted hover:text-moon-accent"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* 整體狀態 */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_available !== false}
                          onChange={e => setFormData(p => ({ ...p, is_available: e.target.checked }))}
                          className="accent-moon-accent"
                        />
                        <span className="text-sm text-moon-text">啟用此項目</span>
                      </label>
                    </div>

                    {/* 日期範圍 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-moon-muted mb-2">可預訂起日</label>
                        <input
                          type="date"
                          value={formData.available_from || ''}
                          onChange={e => setFormData(p => ({ ...p, available_from: e.target.value || null }))}
                          className="w-full px-3 py-2 bg-moon-dark border border-moon-border text-moon-text focus:outline-none focus:border-moon-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-moon-muted mb-2">可預訂迄日</label>
                        <input
                          type="date"
                          value={formData.available_until || ''}
                          onChange={e => setFormData(p => ({ ...p, available_until: e.target.value || null }))}
                          className="w-full px-3 py-2 bg-moon-dark border border-moon-border text-moon-text focus:outline-none focus:border-moon-accent"
                        />
                      </div>
                    </div>

                    {/* 黑名單日期 */}
                    <div>
                      <label className="block text-xs text-moon-muted mb-2">不提供日期（材料用盡）</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="date"
                          id={`date-${item.id}`}
                          className="flex-1 px-3 py-2 bg-moon-dark border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById(`date-${item.id}`) as HTMLInputElement;
                            if (input?.value) {
                              handleAddUnavailableDate(input.value);
                              input.value = '';
                            }
                          }}
                          className="px-3 py-2 bg-moon-accent text-moon-black text-sm font-semibold hover:opacity-90"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(formData.unavailable_dates || []).map((date, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1 bg-moon-dark border border-red-500 rounded text-sm text-moon-text"
                          >
                            {date}
                            <button
                              onClick={() => handleRemoveUnavailableDate(idx)}
                              className="text-red-500 hover:text-red-300"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 可用週幾 */}
                    <div>
                      <label className="block text-xs text-moon-muted mb-3">可提供服務的日期</label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map(day => (
                          <button
                            key={day.value}
                            onClick={() => toggleWeekday(day.value)}
                            className={`px-4 py-2 rounded text-sm font-semibold transition ${
                              (formData.available_weekdays || []).includes(day.value)
                                ? 'bg-moon-accent text-moon-black'
                                : 'bg-moon-dark border border-moon-border text-moon-text hover:border-moon-accent'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 預訂提前時間 */}
                    <div>
                      <label className="block text-xs text-moon-muted mb-2">最少預訂提前時間（小時）</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.min_advance_hours || 24}
                        onChange={e => setFormData(p => ({ ...p, min_advance_hours: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 bg-moon-dark border border-moon-border text-moon-text focus:outline-none focus:border-moon-accent"
                      />
                    </div>

                    {/* 備註 */}
                    <div>
                      <label className="block text-xs text-moon-muted mb-2">備註</label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                        className="w-full px-3 py-2 bg-moon-dark border border-moon-border text-moon-text focus:outline-none focus:border-moon-accent resize-none"
                        rows={2}
                        placeholder="例如：冬季限定，2/1-3/1 停止"
                      />
                    </div>

                    {/* 按鈕 */}
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-moon-border text-moon-text hover:bg-moon-black"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-moon-accent text-moon-black font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save size={16} />
                        {saving ? '儲存中...' : '保存設定'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // 顯示模式
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-moon-accent">{item.name}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded font-semibold ${
                            avail?.is_available
                              ? 'bg-green-900 text-green-200'
                              : 'bg-red-900 text-red-200'
                          }`}
                        >
                          {avail?.is_available ? '啟用' : '停用'}
                        </span>
                      </div>
                      <p className="text-xs text-moon-muted mb-3">{item.category}</p>

                      {avail ? (
                        <div className="grid grid-cols-2 gap-4 text-xs text-moon-text">
                          <div>
                            <span className="text-moon-muted">日期範圍:</span>{' '}
                            {avail.available_from || '無'} ~ {avail.available_until || '無'}
                          </div>
                          <div>
                            <span className="text-moon-muted">可用週幾:</span>{' '}
                            {avail.available_weekdays.length === 7 ? '全週' : avail.available_weekdays.map(d => WEEKDAYS.find(w => w.value === d)?.label).join(', ')}
                          </div>
                          {avail.unavailable_dates.length > 0 && (
                            <div className="col-span-2">
                              <span className="text-moon-muted">不提供日期:</span>{' '}
                              {avail.unavailable_dates.join(', ')}
                            </div>
                          )}
                          <div>
                            <span className="text-moon-muted">最少預訂時間:</span>{' '}
                            {avail.min_advance_hours}小時
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-moon-muted">無特殊設定</p>
                      )}
                    </div>

                    <button
                      onClick={() => startEdit(item.id)}
                      className="px-4 py-2 bg-moon-accent text-moon-black font-semibold hover:opacity-90 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Edit2 size={16} />
                      編輯
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
