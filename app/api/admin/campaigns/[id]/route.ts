import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

const ALLOWED_TYPES   = ['email', 'push', 'sms'];
const ALLOWED_STATUS  = ['draft', 'scheduled', 'active', 'completed', 'paused'];

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = params?.id;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const body = await req.json();
        const { title, description, type, status, target_audience, scheduled_at } = body;

        if (type && !ALLOWED_TYPES.includes(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
        if (status && !ALLOWED_STATUS.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const payload: Record<string, unknown> = {};
        if (title           !== undefined) payload.title           = title;
        if (description     !== undefined) payload.description     = description;
        if (type            !== undefined) payload.type            = type;
        if (status          !== undefined) payload.status          = status;
        if (target_audience !== undefined) payload.target_audience = target_audience;
        if (scheduled_at    !== undefined) payload.scheduled_at    = scheduled_at;

        const db = createAdminClient();
        const { data, error } = await db
            .from('campaigns')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('PATCH /api/admin/campaigns/[id] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('PATCH /api/admin/campaigns/[id] error:', error);
        return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = params?.id;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const db = createAdminClient();
        const { error } = await db
            .from('campaigns')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('DELETE /api/admin/campaigns/[id] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/admin/campaigns/[id] error:', error);
        return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }
}
