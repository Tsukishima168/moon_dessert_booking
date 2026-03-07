'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Loader2, Package, CheckCircle, Clock, Truck, XCircle,
    RefreshCw, LogOut, TrendingUp, AlertCircle, Eye, DollarSign,
    Tag, Settings, ChevronDown, ChevronUp, ArrowUpDown
} from 'lucide-react';
import Image from 'next/image';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/lib/supabase';

// 訂單狀態配置（包含 cancelled 用於篩選顯示）
const ORDER_STATUS = {
    pending:   { label: '待付款', color: 'text-yellow-400', bg: 'bg-yellow-400/10',  icon: Clock },
    paid:      { label: '已付款', color: 'text-blue-400',   bg: 'bg-blue-400/10',   icon: CheckCircle },
    ready:     { label: '可取貨', color: 'text-green-400',  bg: 'bg-green-400/10',  icon: Truck },
    completed: { label: '已完成', color: 'text-moon-muted', bg: 'bg-moon-muted/10', icon: CheckCircle },
    cancelled: { label: '已取消', color: 'text-red-400',    bg: 'bg-red-400/10',    icon: XCircle },
} as const;

type OrderStatus = keyof typeof ORDER_STATUS;

// 看板欄位（不含 cancelled — 取消後隱藏）
const KANBAN_STATUSES: OrderStatus[] = ['pending', 'paid', 'ready', 'completed'];

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
    original_price?: number;
    discount_amount?: number;
    promo_code?: string;
    status: string;
    delivery_method: 'pickup' | 'delivery';
    delivery_address?: string;
    delivery_fee?: number;
    delivery_notes?: string;
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
    failedNotifications: number;
}

// 取貨時間緊迫度（僅用於今天的訂單）
function getPickupUrgency(pickupTime: string): 'urgent' | 'today' | 'normal' {
    try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        // pickup_time 格式通常是 "2025-03-07 14:00" 或 "2025-03-07 下午2:00"
        if (!pickupTime.startsWith(todayStr)) return 'normal';
        const hourMatch = pickupTime.match(/(\d{1,2}):(\d{2})/);
        if (!hourMatch) return 'today';
        const pickupHour = parseInt(hourMatch[1]);
        const nowHour = now.getHours();
        return pickupHour - nowHour <= 2 ? 'urgent' : 'today';
    } catch {
        return 'normal';
    }
}

function formatCreatedAt(iso: string): string {
    try {
        const d = new Date(iso);
        return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
        return iso;
    }
}

export default function AdminPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'pickup_time' | 'created_at'>('pickup_time');
    const [updating, setUpdating] = useState<string | null>(null);
    const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
    const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [showDashboard, setShowDashboard] = useState(true);
    const [discordStatus, setDiscordStatus] = useState<DiscordStatus>({ isConnected: false, failedNotifications: 0 });

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const url = statusFilter === 'all'
                ? '/api/admin/orders?limit=200'
                : `/api/admin/orders?status=${statusFilter}&limit=200`;

            const response = await fetch(url);
            const result = await response.json();

            if (result.success) {
                const orderList: Order[] = result.data || [];
                setOrders(orderList);

                const today = new Date().toISOString().split('T')[0];
                const todayOrders = orderList.filter(o =>
                    o.created_at.startsWith(today) && ['paid', 'ready', 'completed'].includes(o.status)
                );

                setStats({
                    totalOrders: orderList.length,
                    totalRevenue: orderList
                        .filter(o => ['paid', 'ready', 'completed'].includes(o.status))
                        .reduce((sum, o) => sum + (o.final_price || o.total_price || 0), 0),
                    todayOrders: todayOrders.length,
                    todayRevenue: todayOrders.reduce((sum, o) => sum + (o.final_price || o.total_price || 0), 0),
                    pendingCount: orderList.filter(o => o.status === 'pending' || o.status === 'paid').length,
                    readyCount: orderList.filter(o => o.status === 'ready').length,
                });
            }
        } catch (error) {
            console.error('載入訂單錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        checkDiscordStatus();
    }, [statusFilter]);

    const checkDiscordStatus = async () => {
        try {
            const response = await fetch('/api/admin/discord-settings');
            if (response.ok) {
                const data = await response.json();
                setDiscordStatus({ isConnected: data.isConfigured || false, failedNotifications: 0 });
            }
        } catch {
            // ignore
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        setUpdating(orderId);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const result = await response.json();
            if (result.success) {
                setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: newStatus } : o));
            }
        } catch (error) {
            console.error('更新狀態錯誤:', error);
        } finally {
            setUpdating(null);
            setCancellingOrder(null);
        }
    };

    const toggleExpand = (orderId: string) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            next.has(orderId) ? next.delete(orderId) : next.add(orderId);
            return next;
        });
    };

    // 看板欄位
    const columns = KANBAN_STATUSES.map(key => ({
        key,
        title: `${ORDER_STATUS[key].label}`,
    }));

    // 排序 helper
    const sortOrders = (list: Order[]) => {
        return [...list].sort((a, b) => {
            if (sortBy === 'pickup_time') {
                return (a.pickup_time || '').localeCompare(b.pickup_time || '');
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    };

    // 依欄位分組（cancelled 訂單不進看板）
    const grouped = useMemo(() => {
        const map: Record<OrderStatus, Order[]> = { pending: [], paid: [], ready: [], completed: [], cancelled: [] };
        orders.forEach(o => {
            const k = (o.status || 'pending') as OrderStatus;
            if (k in map) map[k].push(o);
            else map['pending'].push(o);
        });
        // 套用排序
        (Object.keys(map) as OrderStatus[]).forEach(k => {
            map[k] = sortOrders(map[k]);
        });
        return map;
    }, [orders, sortBy]);

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        const to = destination.droppableId as OrderStatus;
        if (source.droppableId === destination.droppableId) return;
        updateStatus(draggableId, to);
    };

    const getNextStatus = (current: string): OrderStatus | null => {
        const flow: Record<string, OrderStatus | null> = {
            pending: 'paid', paid: 'ready', ready: 'completed', completed: null, cancelled: null,
        };
        return flow[current] ?? null;
    };

    const isActive = (status: string) => ['pending', 'paid', 'ready'].includes(status);

    // 訂單卡片
    const OrderCard = ({ order, index }: { order: Order; index: number }) => {
        const statusConfig = ORDER_STATUS[order.status as OrderStatus] ?? ORDER_STATUS.pending;
        const StatusIcon = statusConfig.icon;
        const nextStatus = getNextStatus(order.status);
        const urgency = getPickupUrgency(order.pickup_time);
        const isExpanded = expandedOrders.has(order.order_id);
        const isCancelling = cancellingOrder === order.order_id;
        const isUpdating = updating === order.order_id;

        const pickupColor =
            urgency === 'urgent' ? 'text-red-400 font-medium' :
            urgency === 'today'  ? 'text-yellow-400' :
            'text-moon-muted';

        return (
            <Draggable draggableId={order.order_id} index={index} key={order.order_id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`border border-moon-border bg-moon-black text-xs space-y-0 ${snapshot.isDragging ? 'ring-1 ring-moon-accent shadow-lg' : ''}`}
                    >
                        {/* 卡片主體（點擊展開） */}
                        <div
                            className="p-3 space-y-2 cursor-pointer"
                            onClick={() => toggleExpand(order.order_id)}
                        >
                            {/* 頂列：訂單 ID + 狀態 + 宅配標籤 */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-moon-accent text-[11px]">{order.order_id}</span>
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] ${statusConfig.bg} ${statusConfig.color}`}>
                                    <StatusIcon size={9} />
                                    {statusConfig.label}
                                </span>
                                {order.delivery_method === 'delivery' && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-purple-400/10 text-purple-300">
                                        <Truck size={9} /> 宅配
                                    </span>
                                )}
                                <span className="ml-auto">
                                    {isExpanded ? <ChevronUp size={12} className="text-moon-muted" /> : <ChevronDown size={12} className="text-moon-muted" />}
                                </span>
                            </div>

                            {/* 客戶資訊 */}
                            <div>
                                <p className="text-white text-sm leading-tight">{order.customer_name}</p>
                                <p className="text-moon-muted">{order.phone}</p>
                            </div>

                            {/* 取貨時間（帶緊迫度顏色） */}
                            <div className="space-y-0.5">
                                <p className={`text-[11px] ${pickupColor}`}>
                                    {urgency === 'urgent' && '⚠ '}
                                    {order.delivery_method === 'delivery' ? '出貨' : '取貨'}：{order.pickup_time}
                                </p>
                                <p className="text-[10px] text-moon-muted/60">下單：{formatCreatedAt(order.created_at)}</p>
                            </div>

                            {/* 品項列表（最多 3 筆） */}
                            <div className="space-y-1 border-t border-moon-border/50 pt-2">
                                {order.items.slice(0, 3).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-[11px] text-moon-text">
                                        <span>
                                            {item.name}
                                            {item.variant_name && <span className="text-moon-muted"> ({item.variant_name})</span>}
                                            <span className="text-moon-muted"> ×{item.quantity}</span>
                                        </span>
                                        <span className="text-moon-muted">${item.price * item.quantity}</span>
                                    </div>
                                ))}
                                {order.items.length > 3 && (
                                    <p className="text-[10px] text-moon-muted">…+{order.items.length - 3} 項</p>
                                )}
                            </div>
                        </div>

                        {/* 展開區：完整資訊 */}
                        {isExpanded && (
                            <div className="px-3 pb-3 border-t border-moon-border/50 pt-2 space-y-1.5 bg-moon-dark/40">
                                {order.email && <p className="text-[11px] text-moon-muted">📧 {order.email}</p>}
                                {order.delivery_address && (
                                    <p className="text-[11px] text-moon-muted">📍 {order.delivery_address}</p>
                                )}
                                {order.delivery_notes && (
                                    <p className="text-[11px] text-moon-muted">📝 {order.delivery_notes}</p>
                                )}
                                {/* 金額明細 */}
                                <div className="border-t border-moon-border/30 pt-1.5 space-y-0.5">
                                    {order.promo_code && (
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-moon-muted">優惠碼 {order.promo_code}</span>
                                            <span className="text-green-400">-${order.discount_amount || 0}</span>
                                        </div>
                                    )}
                                    {(order.delivery_fee || 0) > 0 && (
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-moon-muted">運費</span>
                                            <span className="text-moon-text">+${order.delivery_fee}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-[11px] font-medium">
                                        <span className="text-moon-muted">合計</span>
                                        <span className="text-moon-accent">${order.final_price || order.total_price}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 操作列 */}
                        <div className="px-3 pb-3 pt-1 border-t border-moon-border/40">
                            {isCancelling ? (
                                /* 取消確認行 */
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-red-300 flex-1">確定取消此訂單？</span>
                                    <button
                                        onClick={() => updateStatus(order.order_id, 'cancelled')}
                                        disabled={isUpdating}
                                        className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-[10px] hover:bg-red-400 transition-colors disabled:opacity-60"
                                    >
                                        {isUpdating ? <Loader2 size={10} className="animate-spin" /> : '確認'}
                                    </button>
                                    <button
                                        onClick={() => setCancellingOrder(null)}
                                        className="px-2 py-1 border border-moon-border text-moon-muted text-[10px] hover:border-moon-muted transition-colors"
                                    >
                                        返回
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className="text-moon-accent text-sm font-light">${order.final_price || order.total_price}</span>
                                    <div className="flex items-center gap-1">
                                        {/* 取消按鈕（僅活躍訂單顯示） */}
                                        {isActive(order.status) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setCancellingOrder(order.order_id); }}
                                                disabled={isUpdating}
                                                className="flex items-center gap-0.5 px-2 py-1 border border-red-500/40 text-red-400 text-[10px] hover:bg-red-500/10 transition-colors disabled:opacity-60"
                                                title="取消訂單"
                                            >
                                                <XCircle size={11} />
                                            </button>
                                        )}
                                        {/* 推進狀態按鈕 */}
                                        {nextStatus && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateStatus(order.order_id, nextStatus); }}
                                                disabled={isUpdating}
                                                className="flex items-center gap-1 px-2 py-1 bg-moon-accent text-moon-black text-[10px] tracking-wide hover:bg-white transition-colors disabled:opacity-60"
                                            >
                                                {isUpdating ? (
                                                    <Loader2 size={11} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle size={11} />
                                                        {ORDER_STATUS[nextStatus].label}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Draggable>
        );
    };

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
                    <div className="flex items-center gap-3">
                        <button onClick={loadOrders} disabled={loading} className="p-2 text-moon-muted hover:text-moon-accent transition-colors">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={handleLogout} className="p-2 text-moon-muted hover:text-red-400 transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* 視圖切換 + Discord 狀態 */}
                <div className="mb-6 flex gap-2 items-center justify-between flex-wrap">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowDashboard(true)}
                            className={`px-4 py-2 text-sm tracking-wider border transition-colors ${showDashboard ? 'border-moon-accent bg-moon-accent/10 text-moon-accent' : 'border-moon-border text-moon-muted hover:border-moon-muted'}`}
                        >
                            📊 儀表板
                        </button>
                        <button
                            onClick={() => setShowDashboard(false)}
                            className={`px-4 py-2 text-sm tracking-wider border transition-colors ${!showDashboard ? 'border-moon-accent bg-moon-accent/10 text-moon-accent' : 'border-moon-border text-moon-muted hover:border-moon-muted'}`}
                        >
                            📋 訂單看板
                        </button>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-moon-border/50 text-xs">
                        <div className={`w-2 h-2 rounded-full ${discordStatus.isConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
                        <span className="text-moon-muted">Discord: {discordStatus.isConnected ? '✓ 已連接' : '⊘ 未設定'}</span>
                    </div>
                </div>

                {/* 儀表板 */}
                {showDashboard && (
                    <div className="space-y-6 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="border border-moon-border bg-moon-dark/70 p-6 hover:border-moon-accent/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">今日訂單</p>
                                        <p className="text-3xl font-light text-moon-accent">{stats?.todayOrders || 0}</p>
                                        <p className="text-xs text-moon-muted mt-2">營收：${(stats?.todayRevenue || 0).toLocaleString()}</p>
                                    </div>
                                    <Package className="text-moon-accent/30" size={32} />
                                </div>
                            </div>
                            <div className="border border-moon-border bg-moon-dark/70 p-6 hover:border-yellow-400/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">待付款 / 已付款</p>
                                        <p className="text-3xl font-light text-yellow-400">{stats?.pendingCount || 0}</p>
                                        <p className="text-xs text-moon-muted mt-2">需要關注的訂單</p>
                                    </div>
                                    <AlertCircle className="text-yellow-400/30" size={32} />
                                </div>
                            </div>
                            <div className="border border-moon-border bg-moon-dark/70 p-6 hover:border-orange-400/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">可取貨</p>
                                        <p className="text-3xl font-light text-orange-400">{stats?.readyCount || 0}</p>
                                        <p className="text-xs text-moon-muted mt-2">等待取貨中</p>
                                    </div>
                                    <TrendingUp className="text-orange-400/30" size={32} />
                                </div>
                            </div>
                            <div className="border border-moon-border bg-moon-dark/70 p-6 hover:border-blue-400/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">總訂單數</p>
                                        <p className="text-3xl font-light text-blue-400">{stats?.totalOrders || 0}</p>
                                        <p className="text-xs text-moon-muted mt-2">歷史統計</p>
                                    </div>
                                    <Eye className="text-blue-400/30" size={32} />
                                </div>
                            </div>
                            <div className="border border-moon-border bg-moon-dark/70 p-6 hover:border-green-400/50 transition-colors md:col-span-2 lg:col-span-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-moon-muted text-sm mb-1">總營收（已付款起）</p>
                                        <p className="text-3xl font-light text-green-400">${(stats?.totalRevenue || 0).toLocaleString()}</p>
                                        <p className="text-xs text-moon-muted mt-2">排除待付款訂單</p>
                                    </div>
                                    <DollarSign className="text-green-400/30" size={32} />
                                </div>
                            </div>
                        </div>

                        {/* 快速操作 */}
                        <div className="border border-moon-border bg-moon-dark/70 p-6">
                            <h3 className="text-sm tracking-wider text-moon-muted mb-4">⚡ 快速操作</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <a href="/admin" className="block border border-moon-border hover:border-moon-accent/50 p-4 text-center transition-colors group">
                                    <Package className="mx-auto mb-2 text-moon-accent/60 group-hover:text-moon-accent transition-colors" size={24} />
                                    <span className="text-xs text-moon-muted group-hover:text-moon-text">訂單看板</span>
                                </a>
                                <a href="/admin/banners" className="block border border-moon-border hover:border-moon-accent/50 p-4 text-center transition-colors group">
                                    <CheckCircle className="mx-auto mb-2 text-moon-accent/60 group-hover:text-moon-accent transition-colors" size={24} />
                                    <span className="text-xs text-moon-muted group-hover:text-moon-text">Banner 管理</span>
                                </a>
                                <a href="/admin/promo-codes" className="block border border-moon-border hover:border-moon-accent/50 p-4 text-center transition-colors group">
                                    <Tag className="mx-auto mb-2 text-moon-accent/60 group-hover:text-moon-accent transition-colors" size={24} />
                                    <span className="text-xs text-moon-muted group-hover:text-moon-text">優惠碼</span>
                                </a>
                                <a href="/admin/settings" className="block border border-moon-border hover:border-moon-accent/50 p-4 text-center transition-colors group">
                                    <Settings className="mx-auto mb-2 text-moon-accent/60 group-hover:text-moon-accent transition-colors" size={24} />
                                    <span className="text-xs text-moon-muted group-hover:text-moon-text">業務設定</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* 訂單看板工具列 */}
                {!showDashboard && (
                    <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
                        {/* 狀態篩選 */}
                        <div className="flex flex-wrap gap-2">
                            {(['all', 'pending', 'paid', 'ready', 'completed', 'cancelled'] as const).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1.5 text-xs tracking-wider border transition-colors ${statusFilter === status
                                        ? 'border-moon-accent bg-moon-accent/10 text-moon-accent'
                                        : status === 'cancelled'
                                            ? 'border-red-500/30 text-red-400/70 hover:border-red-500/60'
                                            : 'border-moon-border text-moon-muted hover:border-moon-muted'
                                    }`}
                                >
                                    {status === 'all' ? '全部' : ORDER_STATUS[status]?.label || status}
                                </button>
                            ))}
                        </div>
                        {/* 排序切換 */}
                        <button
                            onClick={() => setSortBy(s => s === 'pickup_time' ? 'created_at' : 'pickup_time')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-moon-border text-moon-muted hover:border-moon-muted transition-colors"
                        >
                            <ArrowUpDown size={12} />
                            排序：{sortBy === 'pickup_time' ? '取貨時間' : '下單時間'}
                        </button>
                    </div>
                )}

                {!showDashboard && (
                    <p className="mb-4 text-xs text-moon-muted">
                        共 {statusFilter === 'all'
                            ? orders.filter(o => o.status !== 'cancelled').length
                            : orders.length} 筆
                        {statusFilter === 'all' && grouped.cancelled.length > 0 && (
                            <span className="ml-2 text-red-400/60">（{grouped.cancelled.length} 已取消）</span>
                        )}
                    </p>
                )}

                {/* 訂單看板主體 */}
                {!showDashboard && (
                    <>
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="animate-spin text-moon-accent" size={32} />
                            </div>
                        ) : statusFilter === 'cancelled' ? (
                            /* 已取消訂單列表（非看板） */
                            <div className="space-y-2">
                                {grouped.cancelled.length === 0 ? (
                                    <div className="text-center py-20 text-moon-muted">
                                        <XCircle size={40} className="mx-auto mb-4 opacity-20" />
                                        <p>沒有已取消的訂單</p>
                                    </div>
                                ) : grouped.cancelled.map(order => (
                                    <div key={order.order_id} className="border border-red-500/20 bg-moon-dark/40 p-4 flex items-center justify-between text-xs">
                                        <div className="space-y-0.5">
                                            <span className="font-mono text-moon-muted text-[11px]">{order.order_id}</span>
                                            <p className="text-white">{order.customer_name} · {order.phone}</p>
                                            <p className="text-moon-muted">取貨：{order.pickup_time} · 下單：{formatCreatedAt(order.created_at)}</p>
                                        </div>
                                        <span className="text-moon-muted">${order.final_price || order.total_price}</span>
                                    </div>
                                ))}
                            </div>
                        ) : orders.filter(o => o.status !== 'cancelled').length === 0 ? (
                            <div className="text-center py-20 text-moon-muted">
                                <Package size={48} className="mx-auto mb-4 opacity-30" />
                                <p>沒有訂單</p>
                            </div>
                        ) : (
                            <div className="-mx-2 overflow-x-auto">
                                <div className="flex gap-4 min-w-[900px] px-2 pb-4">
                                    <DragDropContext onDragEnd={onDragEnd}>
                                        {columns.map(col => (
                                            <Droppable droppableId={col.key} key={col.key}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`w-64 flex-shrink-0 border border-moon-border bg-moon-dark/70 p-3 transition-colors ${snapshot.isDraggingOver ? 'border-moon-accent/60 bg-moon-dark' : ''}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className={`text-xs tracking-wide font-medium ${ORDER_STATUS[col.key].color}`}>
                                                                {col.title}
                                                            </span>
                                                            <span className="text-[10px] text-moon-muted bg-moon-border/30 px-2 py-0.5">
                                                                {grouped[col.key].length}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-3 min-h-[60px]">
                                                            {grouped[col.key].map((order, index) => (
                                                                <OrderCard key={order.order_id} order={order} index={index} />
                                                            ))}
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
        </div>
    );
}
