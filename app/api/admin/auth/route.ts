import { randomUUID } from 'crypto';
import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
    clearAuthFailures,
    getClientIdentity,
    getLockStatus,
    registerAuthFailure,
} from '@/app/api/admin/_utils/adminAuthLimiter';

const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7; // 7 天

function secureCompare(input: string, expected: string): boolean {
    const inputHash = createHash('sha256').update(input).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(inputHash, expectedHash);
}

// POST /api/admin/auth - 驗證後台密碼
export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentity(request);
        const lockStatus = await getLockStatus(clientId);
        if (lockStatus.locked) {
            return NextResponse.json(
                {
                    success: false,
                    message: '嘗試次數過多，請稍後再試',
                    retry_after_seconds: lockStatus.retryAfterSeconds,
                },
                {
                    status: 429,
                    headers: { 'Retry-After': String(lockStatus.retryAfterSeconds) },
                }
            );
        }

        const { password } = await request.json();

        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPassword) {
            console.error('[ADMIN_AUTH] ADMIN_PASSWORD is not configured');
            return NextResponse.json(
                { success: false, message: '伺服器尚未設定管理員密碼' },
                { status: 500 }
            );
        }

        if (typeof password !== 'string') {
            return NextResponse.json(
                { success: false, message: '密碼格式錯誤' },
                { status: 400 }
            );
        }

        if (secureCompare(password, adminPassword)) {
            await clearAuthFailures(clientId);

            // 產生唯一 session token，存入 DB
            const token = randomUUID();
            const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_S * 1000).toISOString();

            const supabase = createAdminClient();
            const { error: insertError } = await supabase
                .from('admin_sessions')
                .insert({ token, expires_at: expiresAt });

            if (insertError) {
                console.error('[ADMIN_AUTH] 無法建立 session:', insertError.message);
                return NextResponse.json(
                    { success: false, message: '登入失敗，請稍後再試' },
                    { status: 500 }
                );
            }

            // 清理過期 sessions（順手，不阻塞）
            supabase
                .from('admin_sessions')
                .delete()
                .lt('expires_at', new Date().toISOString())
                .then(() => {/* fire-and-forget */});

            const response = NextResponse.json({ success: true });
            response.cookies.set('admin_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: SESSION_MAX_AGE_S,
            });
            return response;
        }

        const failureStatus = await registerAuthFailure(clientId);
        if (failureStatus.lockedNow) {
            return NextResponse.json(
                {
                    success: false,
                    message: '嘗試次數過多，請稍後再試',
                    retry_after_seconds: failureStatus.retryAfterSeconds,
                },
                {
                    status: 429,
                    headers: { 'Retry-After': String(failureStatus.retryAfterSeconds) },
                }
            );
        }

        return NextResponse.json(
            { success: false, message: '密碼錯誤' },
            { status: 401 }
        );
    } catch (error) {
        console.error('[ADMIN_AUTH] error:', error);
        return NextResponse.json(
            { success: false, message: '驗證失敗' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/auth - 登出，撤銷 session token
export async function DELETE(request: NextRequest) {
    const token = request.cookies.get('admin_token')?.value;

    if (token) {
        const supabase = createAdminClient();
        await supabase.from('admin_sessions').delete().eq('token', token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
    });
    return response;
}
