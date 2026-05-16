'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Eye, MousePointerClick, RefreshCw, Search } from 'lucide-react';

type AnalyticsRange = '7d' | '28d' | '90d';

interface SiteAnalyticsRow {
  key: string;
  label: string;
  hostname: string;
  searchConsoleSiteUrl: string;
  ga4: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    eventCount: number;
  };
  searchConsole: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    error?: string;
  };
}

interface SiteAnalyticsResponse {
  range: AnalyticsRange;
  startDate: string;
  endDate: string;
  ga4PropertyId: string;
  credentials: {
    ga4: boolean;
    searchConsole: boolean;
  };
  sites: SiteAnalyticsRow[];
  errors: string[];
}

const RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '7d', label: '7 天' },
  { value: '28d', label: '28 天' },
  { value: '90d', label: '90 天' },
];

export default function SiteAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('28d');
  const [data, setData] = useState<SiteAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const sites = data?.sites || [];
    return sites.reduce(
      (sum, site) => ({
        activeUsers: sum.activeUsers + site.ga4.activeUsers,
        sessions: sum.sessions + site.ga4.sessions,
        pageViews: sum.pageViews + site.ga4.screenPageViews,
        clicks: sum.clicks + site.searchConsole.clicks,
        impressions: sum.impressions + site.searchConsole.impressions,
      }),
      { activeUsers: 0, sessions: 0, pageViews: 0, clicks: 0, impressions: 0 },
    );
  }, [data]);

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/site-analytics?range=${range}`);
      if (!response.ok) throw new Error('site analytics request failed');
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-moon-black p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light text-moon-accent tracking-wider mb-2">站點成效</h1>
            <p className="text-sm text-moon-muted">GA4 流量與 Search Console 搜尋曝光</p>
          </div>
          <div className="flex items-center gap-2">
            {RANGES.map((item) => (
              <button
                key={item.value}
                onClick={() => setRange(item.value)}
                className={`px-4 py-2 text-xs tracking-wider border transition-colors ${range === item.value ? 'border-moon-accent bg-moon-accent/10 text-moon-accent' : 'border-moon-border text-moon-muted hover:border-moon-muted'}`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 text-moon-muted hover:text-moon-accent border border-moon-border hover:border-moon-accent transition-colors disabled:opacity-50"
              title="重新整理"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {data && (
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-moon-muted">
            <span>區間：{data.startDate} 到 {data.endDate}</span>
            <span>GA4 Property：{data.ga4PropertyId}</span>
            <span className={data.credentials.ga4 ? 'text-green-400' : 'text-yellow-400'}>
              GA4 credential {data.credentials.ga4 ? 'ready' : 'missing'}
            </span>
            <span className={data.credentials.searchConsole ? 'text-green-400' : 'text-yellow-400'}>
              Search Console credential {data.credentials.searchConsole ? 'ready' : 'missing'}
            </span>
          </div>
        )}

        {(error || (data?.errors.length || 0) > 0) && (
          <div className="mb-6 border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {error && <p>{error}</p>}
                {data?.errors.map((item) => <p key={item}>{item}</p>)}
              </div>
            </div>
          </div>
        )}

        {loading && !data ? (
          <div className="min-h-[320px] flex items-center justify-center text-moon-muted">載入中...</div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <MetricCard icon={<Activity size={28} />} label="活躍使用者" value={formatNumber(totals.activeUsers)} tone="text-moon-accent" />
              <MetricCard icon={<BarChart3 size={28} />} label="Sessions" value={formatNumber(totals.sessions)} tone="text-blue-400" />
              <MetricCard icon={<Eye size={28} />} label="Page Views" value={formatNumber(totals.pageViews)} tone="text-green-400" />
              <MetricCard icon={<MousePointerClick size={28} />} label="搜尋點擊" value={formatNumber(totals.clicks)} tone="text-purple-400" />
              <MetricCard icon={<Search size={28} />} label="搜尋曝光" value={formatNumber(totals.impressions)} tone="text-yellow-300" />
            </div>

            <div className="border border-moon-border bg-moon-dark/70 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-moon-border text-moon-muted">
                    <th className="px-4 py-3 font-normal">站點</th>
                    <th className="px-4 py-3 font-normal text-right">活躍使用者</th>
                    <th className="px-4 py-3 font-normal text-right">Sessions</th>
                    <th className="px-4 py-3 font-normal text-right">Page Views</th>
                    <th className="px-4 py-3 font-normal text-right">搜尋點擊</th>
                    <th className="px-4 py-3 font-normal text-right">搜尋曝光</th>
                    <th className="px-4 py-3 font-normal text-right">CTR</th>
                    <th className="px-4 py-3 font-normal text-right">平均排名</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sites.map((site) => (
                    <tr key={site.key} className="border-b border-moon-border/40 hover:bg-moon-accent/5 transition-colors">
                      <td className="px-4 py-4">
                        <p className="text-moon-text font-medium">{site.label}</p>
                        <p className="text-xs text-moon-muted">{site.hostname}</p>
                        {site.searchConsole.error && (
                          <p className="text-xs text-yellow-300 mt-1">{site.searchConsole.error}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-moon-accent">{formatNumber(site.ga4.activeUsers)}</td>
                      <td className="px-4 py-4 text-right text-blue-400">{formatNumber(site.ga4.sessions)}</td>
                      <td className="px-4 py-4 text-right text-green-400">{formatNumber(site.ga4.screenPageViews)}</td>
                      <td className="px-4 py-4 text-right text-purple-400">{formatNumber(site.searchConsole.clicks)}</td>
                      <td className="px-4 py-4 text-right text-yellow-300">{formatNumber(site.searchConsole.impressions)}</td>
                      <td className="px-4 py-4 text-right text-moon-text">{site.searchConsole.ctr}%</td>
                      <td className="px-4 py-4 text-right text-moon-text">{site.searchConsole.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="border border-moon-border bg-moon-dark/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-moon-muted text-sm mb-2">{label}</p>
          <p className={`text-2xl font-light ${tone}`}>{value}</p>
        </div>
        <div className={`${tone} opacity-50`}>{icon}</div>
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('zh-TW');
}
