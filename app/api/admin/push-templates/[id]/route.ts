import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

const ALLOWED_CHANNELS       = ['line', 'sms', 'push'];
const ALLOWED_TEMPLATE_TYPES = ['order_update', 'promotion', 'reminder', 'event', 'custom'];

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
        const { name, channel, template_type, title, message, image_url, action_url, variables, is_active } = body;

        if (channel !== undefined && !ALLOWED_CHANNELS.includes(channel)) {
            return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
        }
        if (template_type !== undefined && !ALLOWED_TEMPLATE_TYPES.includes(template_type)) {
            return NextResponse.json({ error: 'Invalid template_type' }, { status: 400 });
        }

        const payload: Record<string, unknown> = {};
        if (name          !== undefined) payload.name          = name;
        if (channel       !== undefined) payload.channel       = channel;
        if (template_type !== undefined) payload.template_type = template_type;
        if (title         !== undefined) payload.title         = title;
        if (message       !== undefined) payload.message       = message;
        if (image_url     !== undefined) payload.image_url     = image_url;
        if (action_url    !== undefined) payload.action_url    = action_url;
        if (variables     !== undefined) payload.variables     = variables;
        if (is_active     !== undefined) payload.is_active     = is_active;

        const db = createAdminClient();
        const { data, error } = await db
            .from('push_templates')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('PATCH /api/admin/push-templates/[id] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('PATCH /api/admin/push-templates/[id] error:', error);
        return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
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
            .from('push_templates')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('DELETE /api/admin/push-templates/[id] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/admin/push-templates/[id] error:', error);
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
}
