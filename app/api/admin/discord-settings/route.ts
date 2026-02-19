import { createAuthClient } from '@/lib/supabase/server-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET - 取得 Discord 設定狀態
export async function GET(req: NextRequest) {
    try {
        const supabase = await createAuthClient();
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return NextResponse.json({ error: '未授權' }, { status: 401 });
        }

        // 檢查是否為管理員
        const role = (session.user.app_metadata?.role || session.user.user_metadata?.role || '')
            .toString()
            .toLowerCase();

        if (role !== 'admin') {
            return NextResponse.json({ error: '無權限' }, { status: 403 });
        }

        // 從環境變數獲取 URL 狀態（不返回實際 URL）
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        const isConfigured = !!webhookUrl;

        return NextResponse.json({
            isConfigured,
            status: isConfigured ? 'connected' : 'not_configured',
            message: isConfigured ? 'Discord Webhook 已設定' : 'Discord Webhook 未設定',
        });
    } catch (error) {
        console.error('Discord 設定錯誤:', error);
        return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
    }
}

// POST - 儲存 Discord 設定（開發用，生產環境應通過環境變數）
export async function POST(req: NextRequest) {
    try {
        const supabase = await createAuthClient();
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return NextResponse.json({ error: '未授權' }, { status: 401 });
        }

        // 檢查是否為管理員
        const role = (session.user.app_metadata?.role || session.user.user_metadata?.role || '')
            .toString()
            .toLowerCase();

        if (role !== 'admin') {
            return NextResponse.json({ error: '無權限' }, { status: 403 });
        }

        const { webhookUrl } = await req.json();

        // 驗證 URL 格式
        if (!webhookUrl || !webhookUrl.includes('discord.com/api/webhooks')) {
            return NextResponse.json({ error: '無效的 Webhook URL 格式' }, { status: 400 });
        }

        // 驗證 Webhook 有效性
        try {
            const testResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '🧪 月島甜點 - Webhook 驗證',
                }),
            });

            if (!testResponse.ok) {
                return NextResponse.json(
                    { error: 'Webhook URL 無效或已過期 (HTTP ' + testResponse.status + ')' },
                    { status: 400 }
                );
            }
        } catch (fetchError) {
            return NextResponse.json(
                { error: '無法連接到 Discord，請檢查 URL' },
                { status: 400 }
            );
        }

        // 儲存到環境變數或資料庫
        // 注意: 實際生產環境應該通過 Vercel/環境管理來設定
        process.env.DISCORD_WEBHOOK_URL = webhookUrl;

        // 記錄到資料庫（可選）
        try {
            await supabase.from('audit_logs').insert({
                user_id: session.user.id,
                action: 'discord_webhook_updated',
                details: {
                    timestamp: new Date().toISOString(),
                    webhookUrlMasked: webhookUrl.substring(0, 40) + '...',
                },
            });
        } catch (logError) {
            console.warn('無法記錄審計日誌:', logError);
        }

        return NextResponse.json({
            success: true,
            message: '✅ Discord Webhook 已驗證並儲存',
        });
    } catch (error) {
        console.error('Discord 設定保存錯誤:', error);
        return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
    }
}
