'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { clearServerSession } from '@/lib/client-auth';

/**
 * Client-side auth callback page.
 * 
 * 雙寫策略 (Dual-Write)：
 * 1. supabase-js 的 exchangeCodeForSession → session 寫入 localStorage（給 Client Components 用）
 * 2. POST /api/auth/set-session → session 寫入 HttpOnly Cookie（給 Server Components 用，如 admin layout）
 * 
 * 這解決了之前 Client/Server session 分裂的問題。
 */
export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            const code = new URLSearchParams(window.location.search).get('code');

            if (code) {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                    console.error('Auth callback error:', error.message);
                } else if (data.session) {
                    // 雙寫：把 token 也刷到 Server 端的 HttpOnly Cookie
                    try {
                        await fetch('/api/auth/set-session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                access_token: data.session.access_token,
                                refresh_token: data.session.refresh_token,
                            }),
                        });
                    } catch (err) {
                        console.error('Failed to sync session to cookies:', err);
                    }
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
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
                    console.error('Failed to persist callback session:', err);
                }
            } else {
                await clearServerSession();
            }

            // 檢查 URL 是否有 redirect 參數（例如從 admin 跳過來的）
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            router.replace(redirect || '/');
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
