'use client';

import { useEffect, useState } from 'react';
import { Users, TrendingUp, DollarSign, MessageSquare, ChevronDown, ChevronUp, Download } from 'lucide-react';

interface CustomerStats {
    total_customers:     number;
    new_customers_today: number;
    returning_customers: number;
    total_revenue:       number;
    average_order_value: number;
    repeat_rate:         number;
    engagement_rate:     number;
}

interface CustomerSegment {
    name:      string;
    key:       string;
    count:     number;
    revenue:   number;
    avg_spend: number;
}

interface CustomerDetail {
    phone:          string;
    name:           string;
    last_order_at:  string;
    total_spend:    number;
    order_count:    number;
}

const SEGMENT_KEYS = ['high_value', 'active', 'new', 'at_risk'];

export default function CustomerAnalyticsPage() {
    const [stats, setStats]         = useState<CustomerStats | null>(null);
    const [segments, setSegments]   = useState<CustomerSegment[]>([]);
    const [loading, setLoading]     = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

    const [expandedKey, setExpandedKey]     = useState<string | null>(null);
    const [customerCache, setCustomerCache] = useState<Record<string, CustomerDetail[]>>({});
    const [loadingCust, setLoadingCust]     = useState(false);

    useEffect(() => { fetchAnalytics(); }, [timeRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/customer-analytics?range=${timeRange}`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setStats(data.stats);
            setSegments((data.segments || []).map((s: Omit<CustomerSegment, 'key'>, i: number) => ({
                ...s,
                key: SEGMENT_KEYS[i] ?? `seg_${i}`,
            })));
        } catch (err) {
            console.error('載入分析錯誤:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = async (key: string) => {
        if (expandedKey === key) { setExpandedKey(null); return; }
        setExpandedKey(key);
        if (customerCache[key]) return;
        setLoadingCust(true);
        try {
            const res = await fetch(`/api/admin/customer-analytics/customers?segment=${key}`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setCustomerCache(prev => ({ ...prev, [key]: data.customers ?? [] }));
        } catch (err) {
            console.error('載入客戶名單錯誤:', err);
        } finally {
            setLoadingCust(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-moon-black flex items-center justify-center">
            <div className="text-moon-muted">載入中...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-moon-black p-6">
            <div className="max-w-6xl mx-auto">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-light text-moon-accent tracking-wider mb-2">👥 客戶分析</h1>
                        <p className="text-sm text-moon-muted">客戶行為分析、消費統計、分群管理</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['7d', '30d', '90d', 'all'] as const).map(range => (
                            <button key={range} onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 text-xs tracking-wider border transition-colors ${timeRange === range ? 'border-moon-accent bg-moon-accent/10 text-moon-accent' : 'border-moon-border text-moon-muted hover:border-moon-muted'}`}>
                                {range === '7d' ? '7天' : range === '30d' ? '30天' : range === '90d' ? '90天' : '全部'}
                            </button>
                        ))}
                        <button className="ml-4 p-2 text-moon-muted hover:text-moon-accent border border-moon-border hover:border-moon-accent transition-colors rounded">
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                {stats && (<>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="border border-moon-border bg-moon-dark/70 p-6 group hover:border-moon-accent/50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-moon-muted text-sm mb-1">客戶總數</p>
                                    <p className="text-3xl font-light text-moon-accent">{stats.total_customers}</p>
                                    <p className="text-xs text-green-400 mt-2">今日新增: +{stats.new_customers_today}</p>
                                </div>
                                <Users className="text-moon-accent/30 group-hover:text-moon-accent/60 transition-colors" size={32} />
                            </div>
                        </div>
                        <div className="border border-moon-border bg-moon-dark/70 p-6 group hover:border-blue-400/50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-moon-muted text-sm mb-1">回客率</p>
                                    <p className="text-3xl font-light text-blue-400">{stats.repeat_rate}%</p>
                                    <p className="text-xs text-moon-muted mt-2">回客: {stats.returning_customers}</p>
                                </div>
                                <TrendingUp className="text-blue-400/30 group-hover:text-blue-400/60 transition-colors" size={32} />
                            </div>
                        </div>
                        <div className="border border-moon-border bg-moon-dark/70 p-6 group hover:border-green-400/50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-moon-muted text-sm mb-1">平均訂單值</p>
                                    <p className="text-3xl font-light text-green-400">${stats.average_order_value}</p>
                                    <p className="text-xs text-moon-muted mt-2">總營收: ${stats.total_revenue}</p>
                                </div>
                                <DollarSign className="text-green-400/30 group-hover:text-green-400/60 transition-colors" size={32} />
                            </div>
                        </div>
                        <div className="border border-moon-border bg-moon-dark/70 p-6 group hover:border-purple-400/50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-moon-muted text-sm mb-1">互動率</p>
                                    <p className="text-3xl font-light text-purple-400">{stats.engagement_rate}%</p>
                                    <p className="text-xs text-moon-muted mt-2">與行銷互動比率</p>
                                </div>
                                <MessageSquare className="text-purple-400/30 group-hover:text-purple-400/60 transition-colors" size={32} />
                            </div>
                        </div>
                    </div>

                    <div className="border border-moon-border bg-moon-dark/70 p-6 mb-8">
                        <h2 className="text-lg text-moon-text font-light tracking-wider mb-6">客戶分群</h2>
                        <div className="space-y-3">
                            {segments.map((seg) => {
                                const isOpen = expandedKey === seg.key;
                                const customers = customerCache[seg.key] ?? [];
                                const isLoadingThis = isOpen && loadingCust && !customerCache[seg.key];
                                return (
                                    <div key={seg.key} className="border border-moon-border/50 hover:border-moon-accent/40 transition-colors">
                                        <div className="flex items-center justify-between p-4">
                                            <h3 className="text-moon-text font-medium">{seg.name}</h3>
                                            <div className="flex items-center gap-6">
                                                <div className="hidden sm:flex items-center gap-6 text-sm text-moon-muted">
                                                    <span>{seg.count} 人</span>
                                                    {seg.revenue > 0 && <span>${seg.revenue} 營收</span>}
                                                    {seg.avg_spend > 0 && <span>平均: ${seg.avg_spend}</span>}
                                                </div>
                                                <button
                                                    onClick={() => toggleExpand(seg.key)}
                                                    className="flex items-center gap-1 text-xs text-moon-muted hover:text-moon-accent px-3 py-1.5 border border-moon-border/50 hover:border-moon-accent/50 rounded transition-colors"
                                                >
                                                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    <span>{isOpen ? '收起' : '展開'}</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mx-4 mb-3 bg-moon-black/50 h-1.5 rounded-full overflow-hidden">
                                            <div className="h-full bg-moon-accent/60 transition-all"
                                                style={{ width: `${(seg.revenue / (segments[0]?.revenue || 1)) * 100}%` }} />
                                        </div>
                                        {isOpen && (
                                            <div className="border-t border-moon-border/40 px-4 pb-4 pt-3">
                                                {isLoadingThis ? (
                                                    <p className="text-moon-muted text-sm py-4 text-center">載入名單中...</p>
                                                ) : customers.length === 0 ? (
                                                    <p className="text-moon-muted text-sm py-4 text-center">此分群目前無客戶</p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="text-left border-b border-moon-border/40">
                                                                    <th className="pb-2 text-moon-muted font-normal pr-4">姓名</th>
                                                                    <th className="pb-2 text-moon-muted font-normal pr-4">電話</th>
                                                                    <th className="pb-2 text-moon-muted font-normal pr-4">最近下單</th>
                                                                    <th className="pb-2 text-moon-muted font-normal pr-4 text-right">累計消費</th>
                                                                    <th className="pb-2 text-moon-muted font-normal text-right">訂單數</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {customers.map((c, i) => (
                                                                    <tr key={`${c.phone}_${i}`} className="border-b border-moon-border/20 hover:bg-moon-accent/5 transition-colors">
                                                                        <td className="py-2.5 pr-4 text-moon-text">{c.name}</td>
                                                                        <td className="py-2.5 pr-4 text-moon-muted font-mono text-xs">{c.phone}</td>
                                                                        <td className="py-2.5 pr-4 text-moon-muted text-xs">{new Date(c.last_order_at).toLocaleDateString('zh-TW')}</td>
                                                                        <td className="py-2.5 pr-4 text-moon-accent text-right font-medium">${c.total_spend.toLocaleString()}</td>
                                                                        <td className="py-2.5 text-moon-muted text-right">{c.order_count}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <p className="text-xs text-moon-muted mt-3 text-right">共 {customers.length} 筆</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border border-moon-border/50 bg-moon-accent/5 p-6">
                        <h3 className="text-moon-accent text-sm tracking-wider mb-4">💡 行銷建議</h3>
                        <ul className="space-y-2 text-sm text-moon-text">
                            {stats.repeat_rate < 30 && <li>• 您的回客率偏低，建議推送更多優惠碼和會員福利來提高回客率</li>}
                            {stats.engagement_rate < 40 && <li>• 互動率不足，嘗試增加推廣活動和 Email 行銷頻率</li>}
                            {stats.average_order_value < 500 && <li>• 平均訂單值較低，考慮推出套餐或組合優惠</li>}
                            <li>• 將重點放在高價值客戶群，持續優化他們的體驗</li>
                        </ul>
                    </div>
                </>)}
            </div>
        </div>
    );
}
