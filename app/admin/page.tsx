'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package, CheckCircle, Clock, Truck, XCircle, RefreshCw, LogOut } from 'lucide-react';
import Image from 'next/image';
import AdminNav from '@/components/AdminNav';

// 訂單狀態配置
const ORDER_STATUS = {
    pending: { label: '待付款', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Clock },
    paid: { label: '已付款', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: CheckCircle },
    preparing: { label: '製作中', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: Package },
    ready: { label: '可取貨', color: 'text-green-400', bg: 'bg-green-400/10', icon: Truck },
    completed: { label: '已完成', color: 'text-moon-muted', bg: 'bg-moon-muted/10', icon: CheckCircle },
    cancelled: { label: '已取消', color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle },
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

export default function AdminPage() {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [updating, setUpdating] = useState<string | null>(null);

    // 驗證密碼
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');

        try {
            const response = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const result = await response.json();

            if (result.success) {
                setIsAuthenticated(true);
                sessionStorage.setItem('admin_auth', 'true');
                loadOrders();
            } else {
                setAuthError('密碼錯誤');
            }
        } catch (error) {
            setAuthError('驗證失敗');
        }
    };

    // 登出
    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_auth');
        setPassword('');
    };

    // 檢查是否已登入
    useEffect(() => {
        if (sessionStorage.getItem('admin_auth') === 'true') {
            setIsAuthenticated(true);
            loadOrders();
        }
    }, []);

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
                setOrders(result.data || []);
            }
        } catch (error) {
            console.error('載入訂單錯誤:', error);
        } finally {
            setLoading(false);
        }
    };

    // 當篩選條件改變時重新載入
    useEffect(() => {
        if (isAuthenticated) {
            loadOrders();
        }
    }, [statusFilter, isAuthenticated]);

    // 更新訂單狀態
    const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
        setUpdating(orderId);
        try {
            const response = await fetch(`/api/admin/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            const result = await response.json();

            if (result.success) {
                // 更新本地狀態
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

    // 取得下一個狀態
    const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
        const flow: Record<OrderStatus, OrderStatus | null> = {
            pending: 'paid',
            paid: 'preparing',
            preparing: 'ready',
            ready: 'completed',
            completed: null,
            cancelled: null,
        };
        return flow[currentStatus];
    };

    // 登入畫面
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="border border-moon-border bg-moon-dark p-8">
                        <div className="text-center mb-8">
                            <Image
                                src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png"
                                alt="月島甜點"
                                width={150}
                                height={50}
                                className="h-10 w-auto mx-auto mb-4"
                            />
                            <h1 className="text-xl font-light text-moon-accent tracking-wider">
                                ADMIN
                            </h1>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full px-4 py-3 bg-moon-black border border-moon-border text-moon-text focus:border-moon-muted focus:outline-none transition-colors"
                                />
                            </div>

                            {authError && (
                                <p className="text-red-400 text-xs text-center">{authError}</p>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-moon-accent text-moon-black text-sm tracking-widest hover:bg-moon-text transition-colors"
                            >
                                LOGIN
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

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

            {/* Admin Navigation */}
            <AdminNav />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* 篩選器 */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {['all', 'pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled'].map((status) => (
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

                {/* 統計 */}
                <div className="mb-6 text-sm text-moon-muted">
                    共 {orders.length} 筆訂單
                </div>

                {/* 訂單列表 */}
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
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const statusConfig = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
                            const StatusIcon = statusConfig.icon;
                            const nextStatus = getNextStatus(order.status);

                            return (
                                <div
                                    key={order.id}
                                    className="border border-moon-border bg-moon-dark p-4 sm:p-6"
                                >
                                    {/* Header */}
                                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-mono text-moon-accent">{order.order_id}</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                                                    <StatusIcon size={12} />
                                                    {statusConfig.label}
                                                </span>
                                                {order.delivery_method === 'delivery' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-400/10 text-purple-400">
                                                        <Truck size={12} />
                                                        宅配
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-moon-muted">
                                                {new Date(order.created_at).toLocaleString('zh-TW')}
                                            </p>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-2xl font-light text-moon-accent">
                                                ${order.final_price || order.total_price}
                                            </p>
                                            {order.promo_code && (
                                                <p className="text-xs text-moon-muted">
                                                    優惠碼: {order.promo_code} (-${order.discount_amount})
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Customer Info */}
                                    <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
                                        <div>
                                            <p className="text-moon-muted mb-1">客戶資訊</p>
                                            <p className="text-moon-text">{order.customer_name}</p>
                                            <p className="text-moon-muted">{order.phone}</p>
                                            {order.email && <p className="text-moon-muted">{order.email}</p>}
                                        </div>
                                        <div>
                                            <p className="text-moon-muted mb-1">
                                                {order.delivery_method === 'delivery' ? '出貨日期' : '取貨時間'}
                                            </p>
                                            <p className="text-moon-text">{order.pickup_time}</p>
                                            {order.delivery_address && (
                                                <p className="text-moon-muted text-xs mt-1">{order.delivery_address}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="border-t border-moon-border pt-4 mb-4">
                                        <p className="text-xs text-moon-muted mb-2">商品明細</p>
                                        <div className="space-y-1">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span className="text-moon-text">
                                                        {item.name}
                                                        {item.variant_name && <span className="text-moon-muted"> ({item.variant_name})</span>}
                                                        <span className="text-moon-muted"> x{item.quantity}</span>
                                                    </span>
                                                    <span className="text-moon-muted">${item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2">
                                        {nextStatus && (
                                            <button
                                                onClick={() => updateStatus(order.order_id, nextStatus)}
                                                disabled={updating === order.order_id}
                                                className="flex items-center gap-2 px-4 py-2 bg-moon-accent text-moon-black text-xs tracking-wider hover:bg-moon-text transition-colors disabled:opacity-50"
                                            >
                                                {updating === order.order_id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle size={14} />
                                                        {ORDER_STATUS[nextStatus].label}
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {order.status !== 'cancelled' && order.status !== 'completed' && (
                                            <button
                                                onClick={() => updateStatus(order.order_id, 'cancelled')}
                                                disabled={updating === order.order_id}
                                                className="flex items-center gap-2 px-4 py-2 border border-red-400/50 text-red-400 text-xs tracking-wider hover:bg-red-400/10 transition-colors disabled:opacity-50"
                                            >
                                                <XCircle size={14} />
                                                取消訂單
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
