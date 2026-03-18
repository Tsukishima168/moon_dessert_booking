import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';

/**
 * POST /api/send-email
 * 通用 email 發送 endpoint（僅限 server-side 呼叫）
 * 需攜帶 x-internal-secret header，值須符合 INTERNAL_API_SECRET 環境變數
 * Body: { to: string, subject: string, html: string }
 */
export async function POST(request: NextRequest) {
  // 驗證內部呼叫憑證
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    console.error('[send-email] INTERNAL_API_SECRET 未設定，拒絕所有請求');
    return NextResponse.json({ success: false, message: '服務未設定' }, { status: 503 });
  }
  const providedSecret = request.headers.get('x-internal-secret');
  if (providedSecret !== internalSecret) {
    return NextResponse.json({ success: false, message: '未授權' }, { status: 401 });
  }
  try {
    const body = await request.json() as unknown;
    const { to, subject, html } = body as { to?: unknown; subject?: unknown; html?: unknown };

    if (typeof to !== 'string' || typeof subject !== 'string' || typeof html !== 'string') {
      return NextResponse.json(
        { success: false, message: '缺少必填欄位: to, subject, html' },
        { status: 400 }
      );
    }

    if (!resend) {
      console.warn('[send-email] RESEND_API_KEY 未設定');
      return NextResponse.json(
        { success: false, message: 'Email 服務未設定' },
        { status: 503 }
      );
    }

    const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({ from, to, subject, html });

    if (error) {
      console.error('[send-email] 發送失敗:', error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[send-email] route 錯誤:', error);
    return NextResponse.json({ success: false, message: '發送失敗' }, { status: 500 });
  }
}
