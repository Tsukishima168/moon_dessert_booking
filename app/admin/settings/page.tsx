'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, Calendar, Clock, Truck, DollarSign } from 'lucide-react';

interface ReservationRules {
    min_advance_days: number;
    max_advance_days: number;
    allow_rush_orders: boolean;
    rush_order_fee_percentage: number;
}

interface DailyCapacity {
    default_limit: number;
    special_dates: Record<string, number>;
}

interface BusinessSettings {
    reservation_rules: ReservationRules;
    daily_capacity: DailyCapacity;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<BusinessSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/admin/settings');
            if (!response.ok) throw new Error('Failed to fetch settings');
            const data = await response.json();
            setSettings(data);
        } catch (error) {
            console.error('取得設定錯誤:', error);
            setMessage('載入設定失敗');
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: string, value: any) => {
        setSaving(true);
        setMessage('');

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    setting_key: key,
                    setting_value: value,
                }),
            });

            if (!response.ok) throw new Error('Failed to update setting');

            setMessage('✅ 設定已儲存');
            setTimeout(() => setMessage(''), 3000);
            await fetchSettings();
        } catch (error) {
            console.error('更新設定錯誤:', error);
            setMessage('❌ 儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    const handleReservationRulesChange = (field: keyof ReservationRules, value: any) => {
        if (!settings) return;
        const updated = {
            ...settings.reservation_rules,
            [field]: value,
        };
        setSettings({
            ...settings,
            reservation_rules: updated,
        });
    };

    const handleDailyCapacityChange = (value: number) => {
        if (!settings) return;
        const updated = {
            ...settings.daily_capacity,
            default_limit: value,
        };
        setSettings({
            ...settings,
            daily_capacity: updated,
        });
    };

    const saveReservationRules = () => {
        if (!settings) return;
        updateSetting('reservation_rules', settings.reservation_rules);
    };

    const saveDailyCapacity = () => {
        if (!settings) return;
        updateSetting('daily_capacity', settings.daily_capacity);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-moon-black flex items-center justify-center">
                <div className="text-moon-muted">載入中...</div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="min-h-screen bg-moon-black flex items-center justify-center">
                <div className="text-red-400">無法載入設定</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-moon-black p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Settings className="text-moon-accent" size={28} />
                        <h1 className="text-2xl font-light text-moon-accent tracking-wider">
                            營業設定
                        </h1>
                    </div>
                    <p className="text-sm text-moon-muted">
                        管理預訂規則、產能限制、營業時間等參數
                    </p>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-6 p-4 border ${message.includes('✅')
                            ? 'border-green-500/30 bg-green-500/10 text-green-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-400'
                        }`}>
                        {message}
                    </div>
                )}

                {/* Reservation Rules */}
                <div className="border border-moon-border bg-moon-dark/30 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Calendar className="text-moon-accent" size={20} />
                        <h2 className="text-lg text-moon-text font-light tracking-wider">
                            預訂規則
                        </h2>
                    </div>

                    <div className="space-y-6">
                        {/* Minimum Advance Days */}
                        <div>
                            <label className="block text-sm text-moon-muted mb-2">
                                最少提前天數 <span className="text-moon-accent">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="30"
                                value={settings.reservation_rules.min_advance_days}
                                onChange={(e) => handleReservationRulesChange('min_advance_days', parseInt(e.target.value))}
                                className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                            />
                            <p className="text-xs text-moon-muted/60 mt-1">
                                客戶至少需提前幾天預訂 (例如: 3 = 需提前3天)
                            </p>
                        </div>

                        {/* Maximum Advance Days */}
                        <div>
                            <label className="block text-sm text-moon-muted mb-2">
                                最多提前天數
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={settings.reservation_rules.max_advance_days}
                                onChange={(e) => handleReservationRulesChange('max_advance_days', parseInt(e.target.value))}
                                className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                            />
                            <p className="text-xs text-moon-muted/60 mt-1">
                                客戶最多可以提前幾天預訂 (例如: 30 = 一個月內)
                            </p>
                        </div>

                        {/* Allow Rush Orders */}
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.reservation_rules.allow_rush_orders}
                                    onChange={(e) => handleReservationRulesChange('allow_rush_orders', e.target.checked)}
                                    className="w-5 h-5"
                                />
                                <div>
                                    <span className="text-moon-text">允許急單預訂</span>
                                    <p className="text-xs text-moon-muted/60">
                                        客戶可以預訂低於最少提前天數的訂單(需加價)
                                    </p>
                                </div>
                            </label>
                        </div>

                        {/* Rush Order Fee */}
                        {settings.reservation_rules.allow_rush_orders && (
                            <div>
                                <label className="block text-sm text-moon-muted mb-2">
                                    急單加價百分比 (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={settings.reservation_rules.rush_order_fee_percentage}
                                    onChange={(e) => handleReservationRulesChange('rush_order_fee_percentage', parseInt(e.target.value))}
                                    className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                                />
                                <p className="text-xs text-moon-muted/60 mt-1">
                                    例如: 20 = 急單需加價 20%
                                </p>
                            </div>
                        )}

                        <button
                            onClick={saveReservationRules}
                            disabled={saving}
                            className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? '儲存中...' : '儲存預訂規則'}
                        </button>
                    </div>
                </div>

                {/* Daily Capacity */}
                <div className="border border-moon-border bg-moon-dark/30 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Clock className="text-moon-accent" size={20} />
                        <h2 className="text-lg text-moon-text font-light tracking-wider">
                            每日產能
                        </h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm text-moon-muted mb-2">
                                每日接單上限 <span className="text-moon-accent">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={settings.daily_capacity.default_limit}
                                onChange={(e) => handleDailyCapacityChange(parseInt(e.target.value))}
                                className="w-full bg-moon-black border border-moon-border px-4 py-3 text-moon-text focus:outline-none focus:border-moon-accent"
                            />
                            <p className="text-xs text-moon-muted/60 mt-1">
                                每天最多可接幾張訂單 (整顆蛋糕產能)
                            </p>
                        </div>

                        <div className="bg-moon-black/40 border border-moon-border/30 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign size={16} className="text-moon-accent" />
                                <span className="text-sm text-moon-text">特殊日期設定</span>
                            </div>
                            <p className="text-xs text-moon-muted/60">
                                目前設定: {Object.keys(settings.daily_capacity.special_dates).length} 個特殊日期
                            </p>
                            <p className="text-xs text-moon-muted/60 mt-2">
                                💡 未來版本將支援圖形化設定情人節、母親節等特殊日期的產能
                            </p>
                        </div>

                        <button
                            onClick={saveDailyCapacity}
                            disabled={saving}
                            className="flex items-center gap-2 bg-moon-accent text-moon-black px-6 py-3 hover:bg-moon-text transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? '儲存中...' : '儲存產能設定'}
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="border border-moon-accent/30 bg-moon-accent/5 p-6">
                    <h3 className="text-sm text-moon-accent mb-4 tracking-wider">目前設定摘要</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-moon-muted">最少提前:</span>
                            <span className="text-moon-text ml-2">{settings.reservation_rules.min_advance_days} 天</span>
                        </div>
                        <div>
                            <span className="text-moon-muted">每日上限:</span>
                            <span className="text-moon-text ml-2">{settings.daily_capacity.default_limit} 筆</span>
                        </div>
                        <div>
                            <span className="text-moon-muted">允許急單:</span>
                            <span className="text-moon-text ml-2">{settings.reservation_rules.allow_rush_orders ? '是' : '否'}</span>
                        </div>
                        {settings.reservation_rules.allow_rush_orders && (
                            <div>
                                <span className="text-moon-muted">急單加價:</span>
                                <span className="text-moon-text ml-2">+{settings.reservation_rules.rush_order_fee_percentage}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
