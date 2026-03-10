import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/admin/customer-analytics/customers?segment=high_value
// segment: high_value | active | new | at_risk
export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const segment = req.nextUrl.searchParams.get('segment') ?? '';
        const db = createAdminClient();
        const now = Date.now();
        const paidStatuses = ['paid', 'ready', 'completed'];

        // 聚合每個 phone 的消費 + 最後下單時間 + 最後下單的姓名
        const { data: allOrders, error } = await db
            .from('orders')
            .select('phone, customer_name, created_at, final_price, total_price, status')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('customers query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rows = allOrders ?? [];

        // 建立 phone → 彙整資料 map
        const phoneMap: Record<string, {
            phone: string;
            name: string;
            last_order_at: string;
            total_spend: number;
            order_count: number;
            first_order_at: string;
        }> = {};

        rows.forEach(o => {
            if (!o.phone) return;
            if (!phoneMap[o.phone]) {
                phoneMap[o.phone] = {
                    phone:         o.phone,
                    name:          o.customer_name || '—',
                    last_order_at: o.created_at,
                    first_order_at: o.created_at,
                    total_spend:   0,
                    order_count:   0,
                };
            }
            const rec = phoneMap[o.phone];
            // 取最新姓名
            if (o.customer_name) rec.name = o.customer_name;
            // 最後下單（rows sorted desc → first seen = latest）
            if (o.created_at > rec.last_order_at) rec.last_order_at = o.created_at;
            if (o.created_at < rec.first_order_at) rec.first_order_at = o.created_at;
            rec.order_count += 1;
            // 只計算付款訂單的消費
            if (paidStatuses.includes(o.status)) {
                rec.total_spend += o.final_price || o.total_price || 0;
            }
        });

        const all = Object.values(phoneMap);
        const now90 = now - 90 * 86400000;
        const now30 = now - 30 * 86400000;

        let filtered: typeof all;

        switch (segment) {
            case 'high_value':
                filtered = all.filter(c => c.total_spend > 5000);
                break;
            case 'active':
                filtered = all.filter(c =>
                    c.total_spend >= 1000 &&
                    c.total_spend <= 5000 &&
                    new Date(c.last_order_at).getTime() > now90
                );
                break;
            case 'new':
                filtered = all.filter(c =>
                    new Date(c.first_order_at).getTime() > now30
                );
                break;
            case 'at_risk':
                filtered = all.filter(c =>
                    new Date(c.last_order_at).getTime() < now90
                );
                break;
            default:
                filtered = all;
        }

        // 依累計消費排序（高到低）
        filtered.sort((a, b) => b.total_spend - a.total_spend);

        return NextResponse.json({ customers: filtered });
    } catch (error) {
        console.error('GET /api/admin/customer-analytics/customers error:', error);
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}
