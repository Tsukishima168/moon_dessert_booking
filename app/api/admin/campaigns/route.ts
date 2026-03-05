import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';

export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 模擬數據 - 實際應從資料庫取得
        const campaigns = [
            {
                id: '1',
                name: '情人節特惠',
                description: '情人節限定優惠',
                type: 'email',
                status: 'active',
                target_audience: '所有客戶',
                start_date: new Date().toISOString(),
                stats: { sent: 150, opened: 85, clicked: 30 },
            },
        ];

        return NextResponse.json({ campaigns });
    } catch (error) {
        console.error('GET /api/admin/campaigns error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch campaigns' },
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

        // TODO: 儲存到資料庫
        return NextResponse.json({ success: true, data: body });
    } catch (error) {
        console.error('POST /api/admin/campaigns error:', error);
        return NextResponse.json(
            { error: 'Failed to create campaign' },
            { status: 500 }
        );
    }
}
