/**
 * Admin auth rate limiter — Supabase-backed
 *
 * 原本用 in-memory Map，在 Vercel serverless 每個 Lambda instance 各自獨立，
 * 導致並行請求可以繞過限制。改用 Supabase 做跨 instance 的共享狀態。
 */
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

const MAX_ATTEMPTS = Number(process.env.ADMIN_AUTH_MAX_ATTEMPTS || 5);
const WINDOW_MS    = Number(process.env.ADMIN_AUTH_WINDOW_MS    || 15 * 60 * 1000);
const LOCKOUT_MS   = Number(process.env.ADMIN_AUTH_LOCKOUT_MS   || 30 * 60 * 1000);

export function getClientIdentity(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown';

    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp.trim();

    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();

    return 'unknown';
}

export async function getLockStatus(
    clientId: string
): Promise<{ locked: boolean; retryAfterSeconds: number }> {
    try {
        const supabase = createAdminClient();
        const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

        const { count } = await supabase
            .from('admin_auth_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .gte('attempted_at', windowStart);

        if ((count ?? 0) < MAX_ATTEMPTS) {
            return { locked: false, retryAfterSeconds: 0 };
        }

        // 找最早的一筆，算 lockout 到期時間
        const { data: oldest } = await supabase
            .from('admin_auth_attempts')
            .select('attempted_at')
            .eq('client_id', clientId)
            .gte('attempted_at', windowStart)
            .order('attempted_at', { ascending: true })
            .limit(1)
            .single();

        const lockoutEnds = oldest
            ? new Date(oldest.attempted_at).getTime() + LOCKOUT_MS
            : Date.now() + LOCKOUT_MS;

        const retryAfterSeconds = Math.max(0, Math.ceil((lockoutEnds - Date.now()) / 1000));
        return { locked: retryAfterSeconds > 0, retryAfterSeconds };
    } catch {
        // DB 查詢失敗時 fail-open（不鎖住合法用戶），但 log 警告
        console.warn('[adminAuthLimiter] getLockStatus DB error — failing open');
        return { locked: false, retryAfterSeconds: 0 };
    }
}

export async function registerAuthFailure(
    clientId: string
): Promise<{ lockedNow: boolean; retryAfterSeconds: number }> {
    try {
        const supabase = createAdminClient();

        await supabase
            .from('admin_auth_attempts')
            .insert({ client_id: clientId });

        // 清理超過 LOCKOUT_MS 的舊記錄，避免表無限成長
        const cutoff = new Date(Date.now() - LOCKOUT_MS).toISOString();
        await supabase
            .from('admin_auth_attempts')
            .delete()
            .eq('client_id', clientId)
            .lt('attempted_at', cutoff);

        const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
        const { count } = await supabase
            .from('admin_auth_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .gte('attempted_at', windowStart);

        if ((count ?? 0) >= MAX_ATTEMPTS) {
            return { lockedNow: true, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
        }

        return { lockedNow: false, retryAfterSeconds: 0 };
    } catch {
        console.warn('[adminAuthLimiter] registerAuthFailure DB error');
        return { lockedNow: false, retryAfterSeconds: 0 };
    }
}

export async function clearAuthFailures(clientId: string): Promise<void> {
    try {
        const supabase = createAdminClient();
        await supabase
            .from('admin_auth_attempts')
            .delete()
            .eq('client_id', clientId);
    } catch {
        console.warn('[adminAuthLimiter] clearAuthFailures DB error');
    }
}
