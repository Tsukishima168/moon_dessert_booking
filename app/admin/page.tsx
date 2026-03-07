'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Package, CheckCircle, Clock, Truck, RefreshCw, LogOut, TrendingUp, AlertCircle, Eye, DollarSign, Tag, Settings } from 'lucide-react';
import Image from 'next/image';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/lib/supabase';

// 訂單狀態配置
const ORDER_STATUS = {
    pending: { label: '待付款', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock },
    paid: { label: '已付款', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: CheckCircle },
    ready: { label: '可取貨', color: 'text-green-400', bg: 'bg-green-400/10', icon: Truck },
    completed: { label: '已完成', color: 'text-moon-muted', bg: 'bg-moon-muted/10', icon: CheckCircle },
};

type OrderStatus = keyof typeof ORDER_STATUS;

interface OrderItem {
    id: string;
    name: string;
    variant_name?: string;
    price: number;
    quantity: number;
}

interface Order {
    id: string;
    order_id: string;
    customer_name: string;
    phone: string;
    email?: string;
    pickup_time: string;
    items: OrderItem[];
    total_price: number;
    final_price: number;
    status: OrderStatus;
    delivery_method: 'pickup' | 'delivery';
    delivery_address?: string;
    promo_code?: string;
    discount_amount?: number;
    created_at: string;
}

interface DashboardStats {
    totalOrders: number;
    totalRevenue: number;
    todayOrders: number;
    todayRevenue: number;
    pendingCount: number;
    readyCount: number;
}

interface DiscordStatus {
    isConnected: boolean;
    lastNotification?: string;
    failedNotifications: number;
}

export default function AdminPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [updating, setUpdating] = useState<string | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [showDashboard, setShowDashboard] = useState(true);
    const [discordStatus, setDiscordStatus] = useState<DiscordStatus>({ isConnected: false, failedNotifications: 0 });

    // 登出
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    // 載入訂單
    const loadOrders = async () => {
        setLoading(true);
        try {
            const url = statusFilter === 'all'
                ? '/api/admin/orders'
                : `/api/admin/orders?status=${statusFilter}`;

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                const orderList = result.data || [];
                setOrders(orderList);

                // 計算統計數據
                const today = new Date().toISOString().split('T')[0];
                const todayOrders = orderList.filter((o: Order) =>
                    o.created_at.startsWith(today) && ['paid', 'ready', 'completed'].includes(o.status)
                );

                const stats: DashboardStats = {
                    totalOrders: orderList.length,
                    totalRevenue: orderList.reduce((sum: number, o: Order) => sum + (o.final_price || o.total_price || 0), 0),
                    todayOrders: todayOrders.length,
                    todayRevenue: todayOrders.reduce((sum: number, o: Order) => sum + (o.final_price || o.total_price || 0), 0),
                    pendingCount: orderList.filter((o: Order) => o.status === 'pending' || o.status === 'paid').length,
                    readyCount: orderList.filter((o: Order) => o.status === 'ready').length,
                };
                setStats(stats);
            }
        } catch (error) {
            console.error('載入訂單錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    // 當篩選條件改變時重新載入
    useEffect(() => {
        loadOrders();
        checkDiscordStatus();
    }, [statusFilter]);

    // 檢查 Discord 連線狀態
    const checkDiscordStatus = async () => {
        try {
            const response = await fetch('/api/admin/discord-settings');
            if (response.ok) {
                const data = await response.json();
                setDiscordStatus({
                    isConnected: data.isConfigured || false,
                    failedNotifications: 0,
                });
            }
        } catch (error) {
            console.error('檢查 Discord 狀態錯誤:', error);
        }
    };

    // 更新訂單狀態
    const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
        setUpdating(orderId);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            const result = await response.json();

            if (result.success) {
                setOrders(orders.map(order =>
                    order.order_id === orderId
                        ? { ...order, status: newStatus }
                        : order
                ));
            }
        } catch (error) {
            console.error('更新狀態錯誤:', error);
        } finally {
            setUpdating(null);
        }
    };

    // Kanban 欄位順序
    const columns: { key: OrderStatus; title: string }[] = [
        { key: 'pending', title: 'Pending / 待付款' },
        { key: 'paid', title: 'Paid / 已付款' },
        { key: 'ready', title: 'Ready / 可取貨' },
        { key: 'completed', title: 'Completed / 已完成' },
    ];

    // 依欄位分組
    const grouped = useMemo(() => {
        const map: Record<OrderStatus, Order[]> = {
            pending: [],
            paid: [],
            ready: [],
            completed: [],
        };
        orders.forEach((o) => {
            const k = (o.status || 'pending') as OrderStatus;
            if (k in map) {
                map[k] = [...(map[k] || []), o];
            } else {
                // 舊狀態（preparing/cancelled）歸入 pending
                map['pending'] = [...map['pending'], o];
            }
        });
        return map;
    }, [orders]);

    // 拖曳處理
    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        const from = source.droppableId as OrderStatus;
        const to = destination.droppableId as OrderStatus;
        if (from === to) return;
        updateStatus(draggableId, to);
    };

    // 取得下一個狀態
    const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
        const flow: Record<OrderStatus, OrderStatus | null> = {
            pending: 'paid',
            paid: 'ready',
            ready: 'completed',
            completed: null,
        };
        return flow[currentStatus];
    };

    // 後台主介面
    return (
        <div className="min-h-screen bg-moon-black">
            {/* Header */}
            <header className="border-b border-moon-border bg-moon-dark">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Image
                            src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png"
                            alt="月島甜點"
                            width={120}
                            height={40}
                            className="h-8 w-auto"
                        />
                        <span className="text-xs text-moon-muted tracking-widest">ADMIN</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={loadOrders}
                            disabled={loading}
                            className="p-2 text-moon-muted hover:text-moon-accent transition-colors"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-moon-muted hover:text-red-400 transition-colors"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* 控制面板切換 */}
                <div className="mb-6 flex gap-2 items-center justify-between">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDashboard(true)}
                            className={`px-4 py-2 text-sm tracking-wider border transition-colors ${showDashboard
                                ? 'border-moon-accent bg-moon-accent/10 text-moon-accent'
                                : 'border-moon-border text-moon-muted hover:border-moon-muted'
                                }`}
                        >
                            📊 儀表板
                        </button>
                        <button
                            onClick={() => setShowDashboard(false)}
                            className={`px-4 py-2 text-sm tracking-wider border transition-colors ${!showDashboard
                                ? 'border-moon-accent bg-moon-accent/10 text-moon-accent'
                                : 'border-moon-border text-moon-muted hover:border-moon-muted'
                                }`}
                        >
                            📋 訂單看板
                        </button>
                    </div>

                    {/* Discord 狀態指示器 */}
                    <div className="flex items-center gap-2 px-4 py-2 border border-moon-border/50 rounded text-xs">
                        <div className={`w-2 h-2 rounded-full ${discordStatus.isConnected ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                        <span className="text-moon-muted">
                            Discord: {discordStatus.isConnected ? '✓ 已連接' : '⊘ 未設定'}
                        </span>
                    </div>
                </div>

                {/* 儀表板視圖 */}
                {showDashboard && (
                    <div className="space-y-6 mb-8">
                        {/* 關鍵指標 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* 今日訂單 */}
                            <div className="border border-moon-border bg-moon-dark/70 p-6 group cursor-pointer hover:border-moon-accent/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">今日訂單</p>
                                        <p className="text-3xl font-light text-moon-accent">{stats?.todayOrders || 0}</p>
                                        <p className="text-xs text-moon-muted mt-2">
                                            營收：${(stats?.todayRevenue || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <Package className="text-moon-accent/30 group-hover:text-moon-accent/60 transition-colors" size={32} />
                                </div>
                            </div>

                            {/* 待處理 */}
                            <div className="border border-moon-border bg-moon-dark/70 p-6 group cursor-pointer hover:border-yellow-400/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">待付款 / 已付款</p>
                                        <p className="text-3xl font-light text-yellow-400">{stats?.pendingCount || 0}</p>
                                        <p className="text-xs text-moon-muted mt-2">需要關注的訂單</p>
                                    </div>
                                    <AlertCircle className="text-yellow-400/30 group-hover:text-yellow-400/60 transition-colors" size={32} />
                                </div>
                            </div>

                            {/* 可取貨 */}
                            <div className="border border-moon-border bg-moon-dark/70 p-6 group cursor-pointer hover:border-orange-400/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">可取貨</p>
                                        <p className="text-3xl font-light text-orange-400">{stats?.readyCount || 0}</p>
                                        <p className="text-xs text-moon-muted mt-2">等待取貨中</p>
                                    </div>
                                    <TrendingUp className="text-orange-400/30 group-hover:text-orange-400/60 transition-colors" size={32} />
                                </div>
                            </div>

                            {/* 總訂單數 */}
                            <div className="border border-moon-border bg-moon-dark/70 p-6 group cursor-pointer hover:border-blue-400/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">總訂單數</p>
                                        <p className="text-3xl font-light text-blue-400">{stats?.totalOrders || 0}</p>
                                        <p className="text-xs text-moon-muted mt-2">歷史統計</p>
                                    </div>
                                    <Eye className="text-blue-400/30 group-hover:text-blue-400/60 transition-colors" size={32} />
                                </div>
                            </div>

                            {/* 總營收 */}
                            <div className="border border-moon-border bg-moon-dark/70 p-6 group cursor-pointer hover:border-green-400/50 transition-colors md:col-span-2 lg:col-span-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">總營收</p>
                                        <p className="text-3xl font-light text-green-400">${(stats?.totalRevenue || 0).toLocaleString()}</p>
                                        <p className="text-xs text-moon-muted mt-2">所有已完成 / 已付款訂單</p>
                                    </div>
                                    <DollarSign className="text-green-400/30 group-hover:text-green-400/60 transition-colors" size={32} />
                                </div>
                            </div>
                        </div>

                        {/* 快速操作 */}
                        <div className="border border-moon-border bg-moon-dark/70 p-6">
                            <h3 className="text-sm tracking-wider text-moon-muted mb-4">⚡ 快速操作</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <a href="/admin" className="block border border-moon-border hover:border-moon-accent/50 p-4 text-center transition-colors group cursor-pointer">
                                    <Package className="mx-auto mb-2 text-moon-accent/60 group-hover:text-moon-accent transition-colors" size={24} />
                                    <span className="text-xs text-moon-muted group-hover:text-moon-text">訂單看板</span>
                                </a>
                                <a href="/admin/banners" className="block border border-moon-border hover:border-moon-accent/50 p-4 text-center transition-colors group cursor-pointer">
                                    <CheckCircle className="mx-auto mb-2 text-moon-accent/60 group-hover:text-moon-accent transition-colors" size={24} />
                                    <span className="text-xs text-moon-muted group-hover:text-moon-text">Banner 管理</span>
                                </a>
                                <a href="/admin/promo-codes" className="block border border-moon-border hover:border-moon-accent/50 p-4 text-center transition-colors group cursor-pointer">
                                    <Tag className="mx-auto mb-2 text-moon-accent/60 group-hover:text-moon-accent transition-colors" size={24} />
                                    <span className="text-xs text-moon-muted group-hover:text-moon-text">優惠碼</span>
                                </a>
                                <a href="/admin/settings" className="block border border-moon-border hover:border-moon-accent/50 p-4 text-center transition-colors group cursor-pointer">
                                    <Settings className="mx-auto mb-2 text-moon-accent/60 group-hover:text-moon-accent transition-colors" size={24} />
                                    <span className="text-xs text-moon-muted group-hover:text-moon-text">業務設定</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* 篩選器 */}
                {!showDashboard && (
                    <div className="mb-6 flex flex-wrap gap-2">
                        {['all', 'pending', 'paid', 'ready', 'completed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 text-xs tracking-wider border transition-colors ${statusFilter === status
                                    ? 'border-moon-accent bg-moon-accent/10 text-moon-accent'
                                    : 'border-moon-border text-moon-muted hover:border-moon-muted'
                                    }`}
                            >
                                {status === 'all' ? '全部' : ORDER_STATUS[status as OrderStatus]?.label || status}
                            </button>
                        ))}
                    </div>
                )}

                {/* 統計 */}
                {!showDashboard && (
                    <div className="mb-6 text-sm text-moon-muted">
                        共 {orders.length} 筆訂單
                    </div>
                )}

                {/* 訂單看板 */}
                {!showDashboard && (
                    <>
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="animate-spin text-moon-accent" size={32} />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-20 text-moon-muted">
                                <Package size={48} className="mx-auto mb-4 opacity-30" />
                                <p>沒有訂單</p>
                            </div>
                        ) : (
                            <div className="-mx-2 overflow-x-auto">
                                <div className="flex gap-4 min-w-[960px] px-2 pb-4">
                                    <DragDropContext onDragEnd={onDragEnd}>
                                        {columns.map((col) => (
                                            <Droppable droppableId={col.key} key={col.key}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`w-64 flex-shrink-0 border border-moon-border bg-moon-dark/70 p-3 rounded-sm transition-colors ${snapshot.isDraggingOver ? 'border-moon-accent/60 bg-moon-dark' : ''}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs tracking-wide text-moon-muted">{col.title}</span>
                                                            <span className="text-[10px] text-moon-muted bg-moon-border/30 px-2 py-0.5">{grouped[col.key].length}</span>
                                                        </div>

                                                        <div className="space-y-3 min-h-[60px]">
                                                            {grouped[col.key].map((order, index) => {
                                                                const statusConfig = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                                                                const StatusIcon = statusConfig.icon;
                                                                const nextStatus = getNextStatus(order.status);

                                                                return (
                                                                    <Draggable draggableId={order.order_id} index={index} key={order.order_id}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                className={`border border-moon-border bg-moon-black p-3 text-xs space-y-2 cursor-grab ${snapshot.isDragging ? 'ring-1 ring-moon-accent' : ''}`}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-mono text-moon-accent text-[11px]">{order.order_id}</span>
                                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 ${statusConfig.bg} ${statusConfig.color}`}>
                                                                                        <StatusIcon size={10} />
                                                                                        {statusConfig.label}
                                                                                    </span>
                                                                                    {order.delivery_method === 'delivery' && (
                                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-purple-400/10 text-purple-300">
                                                                                            <Truck size={10} /> 宅配
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                <div>
                                                                                    <p className="text-white text-sm leading-tight">{order.customer_name}</p>
                                                                                    <p className="text-moon-muted">{order.phone}</p>
                                                                                </div>

                                                                                <div className="text-moon-muted text-[11px]">
                                                                                    {order.delivery_method === 'delivery' ? '出貨' : '取貨'}：{order.pickup_time}
                                                                                </div>

                                                                                <div className="space-y-1 border-t border-moon-border/70 pt-2">
                                                                                    {order.items.slice(0, 3).map((item, idx) => (
                                                                                        <div key={idx} className="flex justify-between text-[11px] text-moon-text">
                                                                                            <span>
                                                                                                {item.name}
                                                                                                {item.variant_name && <span className="text-moon-muted"> ({item.variant_name})</span>}
                                                                                                <span className="text-moon-muted"> x{item.quantity}</span>
                                                                                            </span>
                                                                                            <span className="text-moon-muted">${item.price * item.quantity}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                    {order.items.length > 3 && (
                                                                                        <div className="text-[11px] text-moon-muted">+{order.items.length - 3} 更多品項</div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="flex items-center justify-between pt-1">
                                                                                    <span className="text-moon-accent text-sm">${order.final_price || order.total_price}</span>
                                                                                    {nextStatus && (
                                                                                        <button
                                                                                            onClick={() => updateStatus(order.order_id, nextStatus)}
                                                                                            disabled={updating === order.order_id}
                                                                                            className="flex items-center gap-1 px-2 py-1 bg-moon-accent text-moon-black text-[10px] tracking-wide hover:bg-white transition-colors disabled:opacity-60"
                                                                                        >
                                                                                            {updating === order.order_id ? (
                                                                                                <Loader2 size={12} className="animate-spin" />
                                                                                            ) : (
                                                                                                <>
                                                                                                    <CheckCircle size={12} />
                                                                                                    {ORDER_STATUS[nextStatus].label}
                                                                                                </>
                                                                                            )}
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                            {provided.placeholder}
                                                        </div>
                                                    </div>
                                                )}
                                            </Droppable>
                                        ))}
                                    </DragDropContext>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div >
    );
}
