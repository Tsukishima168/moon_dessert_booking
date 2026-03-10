import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED_CHANNELS      = ['line', 'sms', 'push'];
const ALLOWED_TEMPLATE_TYPES = ['order_update', 'promotion', 'reminder', 'event', 'custom'];

export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = createAdminClient();
        const { data, error } = await db
            .from('push_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('GET /api/admin/push-templates query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ templates: data ?? [] });
    } catch (error) {
        console.error('GET /api/admin/push-templates error:', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, channel, template_type, title, message, image_url, action_url, variables, is_active } = body;

        if (!name || !channel || !template_type) {
            return NextResponse.json({ error: 'name, channel and template_type are required' }, { status: 400 });
        }
        if (!ALLOWED_CHANNELS.includes(channel)) {
            return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
        }
        if (!ALLOWED_TEMPLATE_TYPES.includes(template_type)) {
            return NextResponse.json({ error: 'Invalid template_type' }, { status: 400 });
        }

        const db = createAdminClient();
        const { data, error } = await db
            .from('push_templates')
            .insert({
                name,
                channel,
                template_type,
                title:      title      ?? null,
                message:    message    ?? '',
                image_url:  image_url  ?? null,
                action_url: action_url ?? null,
                variables:  variables  ?? [],
                is_active:  is_active  ?? true,
            })
            .select()
            .single();

        if (error) {
            console.error('POST /api/admin/push-templates insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('POST /api/admin/push-templates error:', error);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}
