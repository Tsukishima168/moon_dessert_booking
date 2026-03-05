import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 模擬分析數據
        const stats = {
            total_customers: 245,
            new_customers_today: 5,
            returning_customers: 156,
            total_revenue: 82500,
            average_order_value: 337,
            repeat_rate: 63,
            engagement_rate: 58,
        };

        const segments = [
            {
                name: '高價值客戶 (消費>$5000)',
                count: 23,
                revenue: 152000,
                avg_spend: 6608,
            },
            {
                name: '活躍客戶 (消費>$1000)',
                count: 87,
                revenue: 98000,
                avg_spend: 1126,
            },
            {
                name: '新客戶 (<30天)',
                count: 45,
                revenue: 12500,
                avg_spend: 278,
            },
            {
                name: '流失風險 (>90天未購買)',
                count: 90,
                revenue: 0,
                avg_spend: 0,
            },
        ];

        return NextResponse.json({ stats, segments });
    } catch (error) {
        console.error('GET /api/admin/customer-analytics error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
