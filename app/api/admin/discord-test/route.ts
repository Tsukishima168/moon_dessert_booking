import { sendDiscordNotify } from '@/lib/notifications';
import { ensureAdmin } from '../_utils/ensureAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - 發送測試通知到 Discord
export async function POST(req: NextRequest) {
    try {
        if (!(await ensureAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message } = await req.json();

        // 建立豐富嵌入式訊息
        const embed = {
            title: '🧪 月島甜點 - 測試通知',
            description: message || '這是一條測試訊息',
            color: 0xFF69B4, // 粉色
            footer: {
                text: '月島甜點訂單系統',
                icon_url: 'https://via.placeholder.com/32',
            },
            timestamp: new Date().toISOString(),
        };

        // 發送通知
        const success = await sendDiscordNotify('🧪 測試訊息已發送', embed);

        if (!success) {
            return NextResponse.json(
                {
                    success: false,
                    message: '❌ 無法發送訊息，請檢查 Discord Webhook 設定',
                },
                { status: 400 }
            );
        }

        // 記錄審計日誌
        try {
            await supabase.from('audit_logs').insert({
                user_id: 'admin_manual',
                action: 'discord_test_sent',
                details: {
                    message,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (logError) {
            console.warn('無法記錄審計日誌:', logError);
        }

        return NextResponse.json({
            success: true,
            message: '✅ 測試訊息已成功發送到 Discord',
        });
    } catch (error) {
        console.error('Discord 測試發送錯誤:', error);
        return NextResponse.json(
            {
                success: false,
                message: '❌ 發送失敗: ' + (error instanceof Error ? error.message : '未知錯誤'),
            },
            { status: 500 }
        );
    }
}
