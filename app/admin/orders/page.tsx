'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, RefreshCw, Clock, CheckCircle, Truck, XCircle,
  ChevronRight, Search, Download,
} from 'lucide-react';

const ORDER_STATUS = {
  pending:   { label: '待付款',  color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  paid:      { label: '已付款',  color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  ready:     { label: '可取貨',  color: 'text-green-400',  bg: 'bg-green-400/10'  },
  completed: { label: '完成',    color: 'text-moon-muted', bg: 'bg-moon-muted/10' },
  cancelled: { label: '已取消',  color: 'text-red-400',    bg: 'bg-red-400/10'    },
} as const;

type OrderStatus = keyof typeof ORDER_STATUS;

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
  linepay_transaction_id?: string | null;
  created_at: string;
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: '現金',
  transfer: '轉帳',
  line_pay: 'LINE Pay',
};

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

  function handleExportCSV() {
    const headers = ['訂單編號', '姓名', '電話', '付款方式', 'Line Pay 交易號', '商品', '金額', '狀態', '取貨時間', '建立時間'];
    const rows = filtered.map(o => [
      o.order_id,
      o.customer_name,
      o.phone,
      PAYMENT_METHOD_LABEL[o.payment_method || ''] || '未設定',
      o.linepay_transaction_id || '',
      buildItemsSummary(o.items || []),
      String(o.final_price ?? o.total_price ?? 0),
      ORDER_STATUS[o.status as OrderStatus]?.label ?? o.status,
      o.pickup_time,
      o.created_at,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-moon-black">
      {/* Header */}
      <header className="border-b border-moon-border bg-moon-dark sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin')}
              className="text-moon-muted hover:text-moon-text transition-colors text-sm"
            >
              ← 後台
            </button>
            <span className="text-moon-border">|</span>
            <h1 className="text-sm tracking-widest text-moon-text">訂單管理</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              disabled={loading || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-moon-border text-moon-muted hover:border-moon-accent hover:text-moon-accent transition-colors disabled:opacity-40"
            >
              <Download size={13} />
              匯出 CSV
            </button>
            <button
              onClick={() => load(statusFilter)}
              disabled={loading}
              className="p-2 text-moon-muted hover:text-moon-accent transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* 篩選列 */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(s => {
              const cfg = s !== 'all' ? ORDER_STATUS[s as OrderStatus] : null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs tracking-wider border transition-colors ${
                    statusFilter === s
                      ? 'border-moon-accent bg-moon-accent/10 text-moon-accent'
                      : s === 'cancelled'
                      ? 'border-red-500/30 text-red-400/70 hover:border-red-500/60'
                      : 'border-moon-border text-moon-muted hover:border-moon-muted'
                  }`}
                >
                  {s === 'all' ? '全部' : cfg?.label}
                </button>
              );
            })}
          </div>
          {/* 搜尋 */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-moon-muted" />
            <input
              type="text"
              placeholder="搜尋訂單號 / 姓名 / 電話"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-moon-dark border border-moon-border text-moon-text placeholder:text-moon-muted/50 focus:outline-none focus:border-moon-accent w-56 transition-colors"
            />
          </div>
        </div>

        {/* 計數 */}
        <p className="text-xs text-moon-muted">
          共 <span className="text-moon-text">{filtered.length}</span> 筆
        </p>

        {/* 表格 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-moon-accent" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-moon-muted text-sm">沒有符合的訂單</div>
        ) : (
          <div className="border border-moon-border overflow-x-auto">
            <table className="w-full text-xs min-w-[860px]">
              <thead>
                <tr className="border-b border-moon-border bg-moon-dark/60">
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">訂單編號</th>
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">客人</th>
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">電話</th>
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">付款資訊</th>
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">取餐時間</th>
                  <th className="text-left px-4 py-3 text-moon-muted font-normal tracking-wider">品項</th>
                  <th className="text-right px-4 py-3 text-moon-muted font-normal tracking-wider">金額</th>
                  <th className="text-center px-4 py-3 text-moon-muted font-normal tracking-wider">狀態</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => {
                  const statusCfg = ORDER_STATUS[order.status as OrderStatus] ?? ORDER_STATUS.pending;
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
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-moon-text">
                            {PAYMENT_METHOD_LABEL[order.payment_method || ''] || '未設定'}
                          </p>
                          {order.payment_method === 'line_pay' && (
                            <p className="text-[11px] text-moon-accent font-mono">
                              {order.linepay_transaction_id || '待回填交易號'}
                            </p>
                          )}
                        </div>
                      </td>
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
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
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
