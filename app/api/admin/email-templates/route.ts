import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';

export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 模擬數據
        const templates = [
            {
                id: '1',
                name: '訂單確認信',
                type: 'order_confirmation',
                subject: '您的訂單已收到 #{order_id}',
                html_content: '<html><body>感謝您的訂單</body></html>',
                is_active: true,
                used_count: 156,
                last_used: new Date().toISOString(),
                created_at: new Date().toISOString(),
            },
        ];

        return NextResponse.json({ templates });
    } catch (error) {
        console.error('GET /api/admin/email-templates error:', error);
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
        console.error('POST /api/admin/email-templates error:', error);
        return NextResponse.json(
            { error: 'Failed to create template' },
            { status: 500 }
        );
    }
}
