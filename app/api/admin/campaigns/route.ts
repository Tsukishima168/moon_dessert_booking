import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const status = req.nextUrl.searchParams.get('status');
        const db = createAdminClient();

        let query = db
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('GET /api/admin/campaigns query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ campaigns: data ?? [] });
    } catch (error) {
        console.error('GET /api/admin/campaigns error:', error);
        return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, type, status, target_audience, scheduled_at } = body;

        if (!title || !type) {
            return NextResponse.json({ error: 'title and type are required' }, { status: 400 });
        }

        const ALLOWED_TYPES = ['email', 'push', 'sms'];
        const ALLOWED_STATUS = ['draft', 'scheduled', 'active', 'completed', 'paused'];

        if (!ALLOWED_TYPES.includes(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
        if (status && !ALLOWED_STATUS.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const db = createAdminClient();
        const { data, error } = await db
            .from('campaigns')
            .insert({
                title,
                description: description ?? null,
                type,
                status: status ?? 'draft',
                target_audience: target_audience ?? null,
                scheduled_at: scheduled_at ?? null,
            })
            .select()
            .single();

        if (error) {
            console.error('POST /api/admin/campaigns insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('POST /api/admin/campaigns error:', error);
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }
}
