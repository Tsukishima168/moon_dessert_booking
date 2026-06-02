import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

function isValidTemplateId(value: unknown): value is string | null | undefined {
    return value === undefined || value === null || typeof value === 'string';
}

function normalizeTemplateId(value: string | null | undefined) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
    }

    return value;
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const body = await req.json();
        const { title, trigger_type, delay_minutes, channels, is_active, template_id } = body;

        const ALLOWED_TRIGGERS = ['order', 'birthday', 'inactive'];
        if (trigger_type !== undefined && !ALLOWED_TRIGGERS.includes(trigger_type)) {
            return NextResponse.json({ error: 'Invalid trigger_type' }, { status: 400 });
        }
        if (!isValidTemplateId(template_id)) {
            return NextResponse.json({ error: 'Invalid template_id' }, { status: 400 });
        }

        const payload: Record<string, unknown> = {};
        if (title           !== undefined) payload.title           = title;
        if (trigger_type    !== undefined) payload.trigger_type    = trigger_type;
        if (delay_minutes   !== undefined) payload.delay_minutes   = delay_minutes;
        if (channels        !== undefined) payload.channels        = channels;
        if (is_active       !== undefined) payload.is_active       = is_active;
        if (template_id     !== undefined) payload.template_id     = normalizeTemplateId(template_id);

        const db = createAdminClient();
        const { data, error } = await db
            .from('marketing_automation_rules')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('PATCH /api/admin/marketing-automation/[id] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('PATCH /api/admin/marketing-automation/[id] error:', error);
        return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const db = createAdminClient();
        const { error } = await db
            .from('marketing_automation_rules')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('DELETE /api/admin/marketing-automation/[id] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/admin/marketing-automation/[id] error:', error);
        return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
    }
}
