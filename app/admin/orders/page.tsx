'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { PageHeader } from '@/components/shared/page-header';
import { SearchFilterBar } from '@/components/shared/search-filter-bar';
import { getOrderStatusMeta, StatusBadge } from '@/components/shared/status-badge';

interface OrderItem {
  name: string;
  variant_name?: string;
  quantity: number;
  price: number;
}

interface AdminOrder {
  order_id: string;
  customer_name: string;
  phone: string;
  pickup_time: string;
  items: OrderItem[];
  final_price: number;
  total_price: number;
  status: string;
  payment_method: string | null;
  created_at: string;
}

function buildItemsSummary(items: OrderItem[]): string {
  return items
    .map(item => {
      const v = item.variant_name ? `(${item.variant_name})` : '';
      return `${item.name}${v} ×${item.quantity}`;
    })
    .join(' / ');
}

function formatDate(s: string): string {
  try {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return s; }
}

const STATUS_FILTERS = ['all', 'pending', 'paid', 'ready', 'completed', 'cancelled'] as const;

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = async (status: string) => {
    setLoading(true);
    try {
      const url = status === 'all'
        ? '/api/admin/orders?limit=200'
        : `/api/admin/orders?status=${status}&limit=200`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setOrders(json.data || []);
    } catch (e) {
      console.error('載入訂單失敗:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_id.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.phone.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-moon-black">
      {/* Header */}
      <header className="border-b border-moon-border bg-moon-dark sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <PageHeader
            title="訂單管理"
            description="查看、搜尋與處理目前的訂單。"
            meta="從這裡進入單筆訂單頁做細部處理。"
            className="flex-1"
          />
          <button
            onClick={() => load(statusFilter)}
            disabled={loading}
            className="p-2 text-moon-muted hover:text-moon-accent transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="搜尋訂單號 / 姓名 / 電話"
          filters={STATUS_FILTERS.map((status) => ({
            value: status,
            label: status === 'all' ? '全部' : getOrderStatusMeta(status).label,
          }))}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />

        {/* 計數 */}
        <p className="text-xs text-moon-muted">
          共 <span className="text-moon-text">{filtered.length}</span> 筆
        </p>

        {/* 表格 */}
        {loading ? (
          <LoadingState text="載入訂單中..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="沒有符合的訂單"
            description="換個篩選條件，或清空搜尋關鍵字再試一次。"
          />
        ) : (
          <div className="border border-moon-border overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-moon-border bg-moon-dark/60">
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">訂單編號</th>
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">客人</th>
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">電話</th>
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">取餐時間</th>
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">品項</th>
                  <th className="text-right px-4 py-3 text-moon-muted font-normal tracking-wider">金額</th>
                  <th className="text-center px-4 py-3 text-moon-muted font-normal tracking-wider">狀態</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => {
                  const price = order.final_price ?? order.total_price ?? 0;
                  return (
                    <tr
                      key={order.order_id}
                      onClick={() => router.push(`/admin/orders/${order.order_id}`)}
                      className={`border-b border-moon-border/50 hover:bg-moon-dark/50 cursor-pointer transition-colors ${
                        i % 2 === 0 ? '' : 'bg-moon-dark/20'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-moon-accent text-[11px]">
                        {order.order_id}
                      </td>
                      <td className="px-4 py-3 text-moon-text">{order.customer_name}</td>
                      <td className="px-4 py-3 text-moon-muted">{order.phone}</td>
                      <td className="px-4 py-3 text-moon-muted whitespace-nowrap">
                        {order.pickup_time}
                      </td>
                      <td className="px-4 py-3 text-moon-muted max-w-[200px] truncate">
                        {buildItemsSummary(order.items || [])}
                      </td>
                      <td className="px-4 py-3 text-right text-moon-accent font-light">
                        ${price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-moon-muted">
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
