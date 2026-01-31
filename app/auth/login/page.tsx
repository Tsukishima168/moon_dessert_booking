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
                        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
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
