'use client';

import { useEffect, useState } from 'react';
import { Users, TrendingUp, ShoppingCart, Heart, MessageSquare, Calendar, DollarSign, Download } from 'lucide-react';

interface CustomerStats {
    total_customers: number;
    new_customers_today: number;
    returning_customers: number;
    total_revenue: number;
    average_order_value: number;
    repeat_rate: number;
    engagement_rate: number;
}

interface CustomerSegment {
    name: string;
    count: number;
    revenue: number;
    avg_spend: number;
}

export default function CustomerAnalyticsPage() {
    const [stats, setStats] = useState<CustomerStats | null>(null);
    const [segments, setSegments] = useState<CustomerSegment[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/customer-analytics?range=${timeRange}`);
            if (!response.ok) throw new Error('Failed to fetch analytics');
            const data = await response.json();
            setStats(data.stats);
            setSegments(data.segments || []);
        } catch (error) {
            console.error('載入分析錯誤:', error);
        } finally {
            setLoading(false);
        }
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
                            👥 客戶分析
                        </h1>
                        <p className="text-sm text-moon-muted">
                            客戶行為分析、消費統計、分群管理
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['7d', '30d', '90d', 'all'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 text-xs tracking-wider border transition-colors ${
                                    timeRange === range
                                        ? 'border-moon-accent bg-moon-accent/10 text-moon-accent'
                                        : 'border-moon-border text-moon-muted hover:border-moon-muted'
                                }`}
                            >
                                {range === '7d' ? '7天' : range === '30d' ? '30天' : range === '90d' ? '90天' : '全部'}
                            </button>
                        ))}
                        <button className="ml-4 p-2 text-moon-muted hover:text-moon-accent border border-moon-border hover:border-moon-accent transition-colors rounded">
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                {/* 關鍵指標 */}
                {stats && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {/* 客戶總數 */}
                            <div className="border border-moon-border bg-moon-dark/70 p-6 group cursor-pointer hover:border-moon-accent/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">客戶總數</p>
                                        <p className="text-3xl font-light text-moon-accent">{stats.total_customers}</p>
                                        <p className="text-xs text-green-400 mt-2">今日新增: +{stats.new_customers_today}</p>
                                    </div>
                                    <Users className="text-moon-accent/30 group-hover:text-moon-accent/60 transition-colors" size={32} />
                                </div>
                            </div>

                            {/* 回客率 */}
                            <div className="border border-moon-border bg-moon-dark/70 p-6 group cursor-pointer hover:border-blue-400/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">回客率</p>
                                        <p className="text-3xl font-light text-blue-400">{stats.repeat_rate}%</p>
                                        <p className="text-xs text-moon-muted mt-2">回客: {stats.returning_customers}</p>
                                    </div>
                                    <TrendingUp className="text-blue-400/30 group-hover:text-blue-400/60 transition-colors" size={32} />
                                </div>
                            </div>

                            {/* 平均訂單值 */}
                            <div className="border border-moon-border bg-moon-dark/70 p-6 group cursor-pointer hover:border-green-400/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">平均訂單值</p>
                                        <p className="text-3xl font-light text-green-400">${stats.average_order_value}</p>
                                        <p className="text-xs text-moon-muted mt-2">總營收: ${stats.total_revenue}</p>
                                    </div>
                                    <DollarSign className="text-green-400/30 group-hover:text-green-400/60 transition-colors" size={32} />
                                </div>
                            </div>

                            {/* 互動率 */}
                            <div className="border border-moon-border bg-moon-dark/70 p-6 group cursor-pointer hover:border-purple-400/50 transition-colors">
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

                        {/* 客戶分群 */}
                        <div className="border border-moon-border bg-moon-dark/70 p-6 mb-8">
                            <h2 className="text-lg text-moon-text font-light tracking-wider mb-6">客戶分群</h2>
                            <div className="space-y-3">
                                {segments.map((segment, idx) => (
                                    <div key={idx} className="border border-moon-border/50 p-4 hover:border-moon-accent/50 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-moon-text font-medium">{segment.name}</h3>
                                            <div className="flex items-center gap-6 text-sm text-moon-muted">
                                                <span>{segment.count} 人</span>
                                                <span>${segment.revenue} 營收</span>
                                                <span>平均: ${segment.avg_spend}</span>
                                            </div>
                                        </div>

                                        {/* 進度條 */}
                                        <div className="w-full bg-moon-black/50 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-moon-accent transition-all"
                                                style={{
                                                    width: `${(segment.revenue / (segments[0]?.revenue || 1)) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 行銷建議 */}
                        <div className="border border-moon-border/50 bg-moon-accent/5 p-6">
                            <h3 className="text-moon-accent text-sm tracking-wider mb-4">💡 行銷建議</h3>
                            <ul className="space-y-2 text-sm text-moon-text">
                                {stats.repeat_rate < 30 && (
                                    <li>• 您的回客率偏低，建議推送更多優惠碼和會員福利來提高回客率</li>
                                )}
                                {stats.engagement_rate < 40 && (
                                    <li>• 互動率不足，嘗試增加推廣活動和 Email 行銷頻率</li>
                                )}
                                {stats.average_order_value < 500 && (
                                    <li>• 平均訂單值較低，考慮推出套餐或組合優惠</li>
                                )}
                                <li>• 將重點放在高價值客戶群，持續優化他們的體驗</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
