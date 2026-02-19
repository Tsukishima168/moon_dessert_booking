import { createAuthClient } from '@/lib/supabase/server-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createAuthClient();
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rules = [
            {
                id: '1',
                name: '訂單確認信',
                trigger_type: 'order_placed',
                action_type: 'email',
                delay_minutes: 0,
                is_active: true,
                total_sent: 324,
                created_at: new Date().toISOString(),
            },
            {
                id: '2',
                name: '生日優惠',
                trigger_type: 'birthday',
                action_type: 'multiple',
                delay_minutes: 480,
                is_active: true,
                total_sent: 42,
                created_at: new Date().toISOString(),
            },
        ];

        return NextResponse.json({ rules });
    } catch (error) {
        console.error('GET /api/admin/marketing-automation error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch rules' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createAuthClient();
        
        const { data: { session } } = await supabase.auth.getSession();
        const role = (session?.user?.app_metadata?.role || '').toString().toLowerCase();
        
        if (!session || role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        return NextResponse.json({ success: true, data: body });
    } catch (error) {
        console.error('POST /api/admin/marketing-automation error:', error);
        return NextResponse.json(
            { error: 'Failed to create rule' },
            { status: 500 }
        );
    }
}
