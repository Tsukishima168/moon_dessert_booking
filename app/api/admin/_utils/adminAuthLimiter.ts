import { NextRequest } from 'next/server';

type AttemptRecord = {
    failedAttempts: number;
    windowStartedAt: number;
    lockedUntil: number;
};

const attempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = Number(process.env.ADMIN_AUTH_MAX_ATTEMPTS || 5);
const WINDOW_MS = Number(process.env.ADMIN_AUTH_WINDOW_MS || 15 * 60 * 1000);
const LOCKOUT_MS = Number(process.env.ADMIN_AUTH_LOCKOUT_MS || 30 * 60 * 1000);

function cleanupExpired(now: number) {
    attempts.forEach((record, key) => {
        const expiredWindow = now - record.windowStartedAt > WINDOW_MS && record.lockedUntil <= now;
        if (expiredWindow) {
            attempts.delete(key);
        }
    });
}

export function getClientIdentity(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim() || 'unknown';
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }

    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    if (cfConnectingIp) {
        return cfConnectingIp.trim();
    }

    return 'unknown';
}

export function getLockStatus(clientId: string): { locked: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    cleanupExpired(now);

    const record = attempts.get(clientId);
    if (!record) {
        return { locked: false, retryAfterSeconds: 0 };
    }

    if (record.lockedUntil > now) {
        return {
            locked: true,
            retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
        };
    }

    return { locked: false, retryAfterSeconds: 0 };
}

export function registerAuthFailure(clientId: string): { lockedNow: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const existing = attempts.get(clientId);

    if (!existing || now - existing.windowStartedAt > WINDOW_MS) {
        const nextRecord: AttemptRecord = {
            failedAttempts: 1,
            windowStartedAt: now,
            lockedUntil: 0,
        };
        attempts.set(clientId, nextRecord);
        return { lockedNow: false, retryAfterSeconds: 0 };
    }

    existing.failedAttempts += 1;

    if (existing.failedAttempts >= MAX_ATTEMPTS) {
        existing.lockedUntil = now + LOCKOUT_MS;
        existing.failedAttempts = 0;
        existing.windowStartedAt = now;
        attempts.set(clientId, existing);
        return { lockedNow: true, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
    }

    attempts.set(clientId, existing);
    return { lockedNow: false, retryAfterSeconds: 0 };
}

export function clearAuthFailures(clientId: string) {
    attempts.delete(clientId);
}
