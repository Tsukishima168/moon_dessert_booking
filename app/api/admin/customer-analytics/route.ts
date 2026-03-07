import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const range = req.nextUrl.searchParams.get('range') || '30d';
        const adminClient = createAdminClient();

        // 計算日期範圍
        const now = new Date();
        let fromDate: Date | null = null;
        if (range === '7d')  fromDate = new Date(now.getTime() - 7  * 86400000);
        if (range === '30d') fromDate = new Date(now.getTime() - 30 * 86400000);
        if (range === '90d') fromDate = new Date(now.getTime() - 90 * 86400000);

        // 撈出所有訂單（含付款的）
        let query = adminClient
            .from('orders')
            .select('phone, created_at, final_price, total_price, promo_code, status')
            .neq('status', 'cancelled');

        if (fromDate) {
            query = query.gte('created_at', fromDate.toISOString());
        }

        const { data: orders, error } = await query;

        if (error) {
            console.error('customer-analytics query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rows = orders || [];
        const paidStatuses = ['paid', 'ready', 'completed'];

        // 所有下過訂單的 phone
        const allPhones = [...new Set(rows.map(o => o.phone).filter(Boolean))];
        const total_customers = allPhones.length;

        // 今日新客（今天有第一筆訂單）
        const todayStr = now.toISOString().split('T')[0];
        const phoneFirstOrder: Record<string, string> = {};
        // 撈全部訂單算每個 phone 最早下單時間（不受 range 限制）
        const { data: allTimeOrders } = await adminClient
            .from('orders')
            .select('phone, created_at')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: true });

        (allTimeOrders || []).forEach(o => {
            if (o.phone && !phoneFirstOrder[o.phone]) {
                phoneFirstOrder[o.phone] = o.created_at.split('T')[0];
            }
        });
        const new_customers_today = Object.values(phoneFirstOrder).filter(d => d === todayStr).length;

        // 回客（有 ≥2 筆訂單）
        const phoneCount: Record<string, number> = {};
        rows.forEach(o => { if (o.phone) phoneCount[o.phone] = (phoneCount[o.phone] || 0) + 1; });
        const returning_customers = Object.values(phoneCount).filter(c => c >= 2).length;
        const repeat_rate = total_customers > 0 ? Math.round((returning_customers / total_customers) * 100) : 0;

        // 營收 & 平均客單
        const paidOrders = rows.filter(o => paidStatuses.includes(o.status));
        const total_revenue = paidOrders.reduce((s, o) => s + (o.final_price || o.total_price || 0), 0);
        const average_order_value = paidOrders.length > 0 ? Math.round(total_revenue / paidOrders.length) : 0;

        // 互動率 = 使用優惠碼 / 所有訂單
        const withPromo = rows.filter(o => o.promo_code).length;
        const engagement_rate = rows.length > 0 ? Math.round((withPromo / rows.length) * 100) : 0;

        // ─── 分群 (基於全時間訂單) ───
        const phoneSpend: Record<string, number> = {};
        const phoneLast: Record<string, number> = {};  // ms timestamp
        (allTimeOrders || []).forEach(o => {
            if (!o.phone) return;
            // spend 只算付款
        });

        const { data: allPaidOrders } = await adminClient
            .from('orders')
            .select('phone, final_price, total_price, created_at')
            .in('status', paidStatuses);

        (allPaidOrders || []).forEach(o => {
            if (!o.phone) return;
            phoneSpend[o.phone] = (phoneSpend[o.phone] || 0) + (o.final_price || o.total_price || 0);
            const t = new Date(o.created_at).getTime();
            if (!phoneLast[o.phone] || t > phoneLast[o.phone]) phoneLast[o.phone] = t;
        });

        const now90DaysAgo = now.getTime() - 90 * 86400000;
        const now30DaysAgo = now.getTime() - 30 * 86400000;

        const highValue  = Object.entries(phoneSpend).filter(([, s]) => s > 5000);
        const active     = Object.entries(phoneSpend).filter(([p, s]) => s >= 1000 && s <= 5000 && (phoneLast[p] || 0) > now90DaysAgo);
        const newCust    = Object.keys(phoneFirstOrder).filter(p => new Date(phoneFirstOrder[p]).getTime() > now30DaysAgo);
        const atRisk     = Object.keys(phoneLast).filter(p => phoneLast[p] < now90DaysAgo);

        const segRevenue = (phones: string[]) => phones.reduce((s, p) => s + (phoneSpend[p] || 0), 0);

        const segments = [
            {
                name: '高價值客戶（消費 > $5000）',
                count: highValue.length,
                revenue: Math.round(segRevenue(highValue.map(([p]) => p))),
                avg_spend: highValue.length > 0 ? Math.round(segRevenue(highValue.map(([p]) => p)) / highValue.length) : 0,
            },
            {
                name: '活躍客戶（$1000-5000，90天內有消費）',
                count: active.length,
                revenue: Math.round(segRevenue(active.map(([p]) => p))),
                avg_spend: active.length > 0 ? Math.round(segRevenue(active.map(([p]) => p)) / active.length) : 0,
            },
            {
                name: '新客戶（30天內首次下單）',
                count: newCust.length,
                revenue: Math.round(segRevenue(newCust)),
                avg_spend: newCust.length > 0 ? Math.round(segRevenue(newCust) / newCust.length) : 0,
            },
            {
                name: '流失風險（90天以上未消費）',
                count: atRisk.length,
                revenue: 0,
                avg_spend: 0,
            },
        ];

        return NextResponse.json({
            stats: {
                total_customers,
                new_customers_today,
                returning_customers,
                total_revenue: Math.round(total_revenue),
                average_order_value,
                repeat_rate,
                engagement_rate,
            },
            segments,
        });
    } catch (error) {
        console.error('GET /api/admin/customer-analytics error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
