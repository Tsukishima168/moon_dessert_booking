import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';

export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const templates = [
            {
                id: '1',
                name: '訂單完成提醒',
                channel: 'line',
                template_type: 'order_update',
                message: '您的訂單 {order_id} 已完成，歡迎領取！',
                variables: ['order_id', 'customer_name'],
                is_active: true,
                created_at: new Date().toISOString(),
            },
        ];

        return NextResponse.json({ templates });
    } catch (error) {
        console.error('GET /api/admin/push-templates error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch templates' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        return NextResponse.json({ success: true, data: body });
    } catch (error) {
        console.error('POST /api/admin/push-templates error:', error);
        return NextResponse.json(
            { error: 'Failed to create template' },
            { status: 500 }
        );
    }
}
