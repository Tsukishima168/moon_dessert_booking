import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

const ALLOWED_TYPES = ['order_confirmation', 'shipping', 'promotional', 'welcome', 'custom'];

export async function PUT(
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
        const { name, type, subject, preview_text, html_content, is_active } = body;

        if (type !== undefined && !ALLOWED_TYPES.includes(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        const payload: Record<string, unknown> = {};
        if (name         !== undefined) payload.name         = name;
        if (type         !== undefined) payload.type         = type;
        if (subject      !== undefined) payload.subject      = subject;
        if (preview_text !== undefined) payload.preview_text = preview_text;
        if (html_content !== undefined) payload.html_content = html_content;
        if (is_active    !== undefined) payload.is_active    = is_active;

        const db = createAdminClient();
        const { data, error } = await db
            .from('email_templates')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('PUT /api/admin/email-templates/[id] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('PUT /api/admin/email-templates/[id] error:', error);
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
            .from('email_templates')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('DELETE /api/admin/email-templates/[id] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/admin/email-templates/[id] error:', error);
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
}
