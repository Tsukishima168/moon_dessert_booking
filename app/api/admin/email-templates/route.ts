import { NextRequest, NextResponse } from 'next/server';
import { ensureAdmin } from '../_utils/ensureAdmin';
import { createAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['order_confirmation', 'shipping', 'promotional', 'welcome', 'custom'];

export async function GET(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = createAdminClient();
        const { data, error } = await db
            .from('email_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('GET /api/admin/email-templates query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ templates: data ?? [] });
    } catch (error) {
        console.error('GET /api/admin/email-templates error:', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, type, subject, preview_text, html_content, is_active } = body;

        if (!name || !type || !subject) {
            return NextResponse.json({ error: 'name, type and subject are required' }, { status: 400 });
        }
        if (!ALLOWED_TYPES.includes(type)) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        const db = createAdminClient();
        const { data, error } = await db
            .from('email_templates')
            .insert({
                name,
                type,
                subject,
                preview_text: preview_text ?? null,
                html_content: html_content ?? '',
                is_active: is_active ?? true,
            })
            .select()
            .single();

        if (error) {
            console.error('POST /api/admin/email-templates insert error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('POST /api/admin/email-templates error:', error);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}
