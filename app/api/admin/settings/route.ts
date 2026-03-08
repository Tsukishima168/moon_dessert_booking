import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin';

export const dynamic = 'force-dynamic';

// GET - 取得所有營業設定
export async function GET() {
    try {
        const isAdmin = await ensureAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createAdminClient();

        const { data: settings, error } = await supabase
            .from('business_settings')
            .select('*')
            .order('setting_key');

        if (error) {
            console.error('取得營業設定錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 轉換成 key-value object
        const settingsObject: Record<string, any> = {};
        (settings || []).forEach((setting) => {
            settingsObject[setting.setting_key] = setting.setting_value;
        });

        return NextResponse.json(settingsObject);
    } catch (error) {
        console.error('API 錯誤 - 取得營業設定:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT - 更新營業設定
export async function PUT(request: NextRequest) {
    try {
        const isAdmin = await ensureAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { setting_key, setting_value } = body;

        if (!setting_key) {
            return NextResponse.json({ error: '缺少 setting_key' }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('business_settings')
            .update({
                setting_value,
                updated_at: new Date().toISOString(),
            })
            .eq('setting_key', setting_key)
            .select()
            .single();

        if (error) {
            console.error('更新營業設定錯誤:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('API 錯誤 - 更新營業設定:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
