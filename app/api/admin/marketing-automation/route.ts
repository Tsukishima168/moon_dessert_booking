import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = createAdminClient();
        const { data, error } = await db
            .from('marketing_automation_rules')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('GET /api/admin/marketing-automation query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ rules: data ?? [] });
    } catch (error) {
        console.error('GET /api/admin/marketing-automation error:', error);
        return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, trigger_type, delay_minutes, channels, is_active } = body;

        if (!title || !trigger_type) {
            return NextResponse.json({ error: 'title and trigger_type are required' }, { status: 400 });
        }

        const ALLOWED_TRIGGERS = ['order', 'birthday', 'inactive'];
        if (!ALLOWED_TRIGGERS.includes(trigger_type)) {
            return NextResponse.json({ error: 'Invalid trigger_type' }, { status: 400 });
        }

        const db = createAdminClient();
        const { data, error } = await db
            .from('marketing_automation_rules')
            .insert({
                title,
                trigger_type,
                delay_minutes: delay_minutes ?? 0,
                channels: channels ?? [],
                is_active: is_active ?? true,
            })
            .select()
            .single();

        if (error) {
            console.error('POST /api/admin/marketing-automation insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('POST /api/admin/marketing-automation error:', error);
        return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }
}
