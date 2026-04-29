'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ensureServerSession } from '@/lib/client-auth';
import { buildPassportLoginUrl } from '@/src/lib/auth-storage';
import { getSafeRedirectPath } from '@/src/lib/safe-redirect';

const errorMessages: Record<string, string> = {
    session_sync_failed: '登入已完成，但會員狀態同步失敗，請再試一次。',
    session_missing: '登入資訊未建立完成，請再試一次。',
};

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error'; text: string } | null>(null);

    const authError = searchParams?.get('error') || null;
    const redirect = getSafeRedirectPath(searchParams?.get('redirect'));

    useEffect(() => {
        if (!authError) {
            setMessage(null);
            return;
        }

        setMessage({
            type: 'error',
            text: errorMessages[authError] || decodeURIComponent(authError),
        });
    }, [authError]);

    useEffect(() => {
        if (authError) return;

        let active = true;
        const restoreLogin = async () => {
            setLoading(true);
            const user = await ensureServerSession(4, 200);
            if (!active) return;

            if (user) {
                router.replace(redirect);
                return;
            }

            const returnTo = new URL(redirect, window.location.origin).toString();
            window.location.replace(buildPassportLoginUrl(returnTo));
        };

        void restoreLogin();

        return () => {
            active = false;
        };
    }, [authError, redirect, router]);

    const handleGoogleLogin = () => {
        if (loading) return;

        setLoading(true);
        setMessage(null);
        const returnTo = new URL(redirect, window.location.origin).toString();
        window.location.href = buildPassportLoginUrl(returnTo);
    };

    return (
        <div className="min-h-screen bg-moon-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <Link href="/" className="inline-block">
                        <h1 className="text-3xl font-light text-moon-accent tracking-widest hover:opacity-80 transition-opacity">
                            MOON MOON
                        </h1>
                    </Link>
                    <p className="text-moon-muted text-sm tracking-wide">
                        會員登入 / 註冊
                    </p>
                </div>

                <div className="bg-moon-dark border border-moon-border p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-moon-accent/5 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

                    <div className="space-y-6 relative z-10">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3 text-sm font-medium hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin w-4 h-4" />
                            ) : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                            )}
                            {loading ? '前往 Google 登入...' : '使用 Google 登入'}
                        </button>

                        {message?.type === 'error' && (
                            <p className="text-red-400 text-xs text-center animate-pulse">
                                {message.text}
                            </p>
                        )}
                    </div>
                </div>

                <div className="text-center">
                    <Link href="/" className="text-xs text-moon-muted hover:text-moon-accent transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
