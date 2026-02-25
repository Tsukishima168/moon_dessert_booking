'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [cooldown, setCooldown] = useState(0);

    // 倒數計時器
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleGoogleLogin = async () => {
        if (loading) return;
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            console.error('Google login error:', error);
            setMessage({ type: 'error', text: error.message || 'Google 登入失敗，請稍後再試。' });
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || cooldown > 0) return;

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;

            setMessage({
                type: 'success',
                text: '登入連結已發送！請檢查您的信箱 (包含垃圾郵件夾)。',
            });
            setCooldown(60); // 60秒冷卻
        } catch (error: any) {
            console.error('Login error:', error);
            setMessage({
                type: 'error',
                text: error.message || '發送失敗，請稍後再試。',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-moon-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
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

                {/* Card */}
                <div className="bg-moon-dark border border-moon-border p-8 shadow-2xl relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-moon-accent/5 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>

                    {!message || message.type === 'error' ? (
                        <div className="space-y-6 relative z-10">
                            {/* Google OAuth */}
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-3 text-sm font-medium hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin w-4 h-4" />
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                        Continue with Google
                                    </>
                                )}
                            </button>

                            {/* 分隔線 */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px bg-moon-border"></div>
                                <span className="text-xs text-moon-muted tracking-widest">OR</span>
                                <div className="flex-1 h-px bg-moon-border"></div>
                            </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-xs text-moon-muted tracking-widest block">
                                    EMAIL ADDRESS
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-moon-muted w-4 h-4" />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="name@example.com"
                                        className="w-full bg-moon-black border border-moon-border pl-10 pr-4 py-3 text-white text-sm focus:border-moon-accent outline-none transition-colors placeholder:text-gray-700"
                                    />
                                </div>
                            </div>

                            <div className="bg-moon-black/50 p-4 border border-moon-border text-xs text-moon-muted leading-relaxed">
                                <p>💡 我們使用 <span className="text-moon-accent">Magic Link</span> 無密碼登入。</p>
                                <p className="mt-1">輸入 Email 後，我們將寄送一個專屬連結給您，點擊即可瞬間登入，無需記憶密碼。</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || cooldown > 0}
                                className="w-full bg-moon-accent text-moon-black py-3 text-sm tracking-widest font-medium hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin w-4 h-4" />
                                ) : cooldown > 0 ? (
                                    `重試 (${cooldown}s)`
                                ) : (
                                    <>
                                        SEND MAGIC LINK
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            {message?.type === 'error' && (
                                <p className="text-red-400 text-xs text-center animate-pulse">
                                    {message.text}
                                </p>
                            )}
                        </form>
                        </div>
                    ) : (
                        <div className="text-center space-y-6 py-4 relative z-10">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl text-white font-light">
                                Check Your Email
                            </h3>
                            <p className="text-moon-muted text-sm leading-relaxed">
                                我們已發送登入連結至 <span className="text-moon-accent">{email}</span>
                            </p>
                            <div className="bg-moon-black border border-moon-border p-3 text-xs text-moon-muted">
                                <p>沒收到信？請檢查垃圾郵件夾，或</p>
                                <button
                                    onClick={() => { setMessage(null); setCooldown(0); }}
                                    className="text-white underline hover:text-moon-accent mt-1"
                                >
                                    重新輸入 Email
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center">
                    <Link href="/" className="text-xs text-moon-muted hover:text-white transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
