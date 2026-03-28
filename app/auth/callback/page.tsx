'use client';

import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { clearServerSession } from '@/lib/client-auth';

/**
 * session 確立後才繼續（避免 detectSessionInUrl 自動交換的競態條件）
 * - 快速路徑：getSession() 已有結果則直接回傳
 * - 慢速路徑：監聽 onAuthStateChange，最多等 5 秒
 */
async function resolveSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session;

    return new Promise<Session | null>((resolve) => {
        const timeout = window.setTimeout(() => {
            subscription.unsubscribe();
            resolve(null);
        }, 5000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (nextSession) {
                window.clearTimeout(timeout);
                subscription.unsubscribe();
                resolve(nextSession);
            }
        });
    });
}

export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const redirect = params.get('redirect');

            // 嘗試手動 exchange（若 detectSessionInUrl 已自動消耗則會失敗，屬正常）
            if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    console.warn('[callback] exchangeCodeForSession:', error.message);
                }
            }

            // 等待 session 確立（快速路徑：getSession，慢速路徑：onAuthStateChange）
            const session = await resolveSession();

            if (session) {
                try {
                    await fetch('/api/auth/set-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            access_token: session.access_token,
                            refresh_token: session.refresh_token,
                        }),
                    });
                } catch (err) {
                    console.error('[callback] Failed to sync session cookie:', err);
                }
            } else {
                await clearServerSession();
            }

            router.replace(redirect ?? '/account');
        };

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen bg-moon-black flex items-center justify-center">
            <p className="text-moon-muted text-sm tracking-widest animate-pulse">
                驗證中，請稍候...
            </p>
        </div>
    );
}
