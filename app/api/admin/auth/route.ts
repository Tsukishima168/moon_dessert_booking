import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import {
    clearAuthFailures,
    getClientIdentity,
    getLockStatus,
    registerAuthFailure,
} from '@/app/api/admin/_utils/adminAuthLimiter';

function secureCompare(input: string, expected: string): boolean {
    const inputHash = createHash('sha256').update(input).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(inputHash, expectedHash);
}

// POST /api/admin/auth - 驗證後台密碼
export async function POST(request: NextRequest) {
    try {
        const clientId = getClientIdentity(request);
        const lockStatus = getLockStatus(clientId);
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
            clearAuthFailures(clientId);
            return NextResponse.json({ success: true });
        }

        const failureStatus = registerAuthFailure(clientId);
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
        return NextResponse.json(
            { success: false, message: '驗證失敗' },
            { status: 500 }
        );
    }
}
