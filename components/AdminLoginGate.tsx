'use client';

import { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';

/**
 * 獨立的後台密碼登入頁面。
 * 與前端 Supabase 會員登入完全分離。
 */
export default function AdminLoginGate() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || !password.trim()) return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();

            if (data.success) {
                // 重新載入頁面，讓 server layout 讀取新 cookie
                window.location.reload();
            } else {
                setError(data.message || '密碼錯誤');
            }
        } catch {
            setError('連線失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center space-y-2">
                    <Lock className="mx-auto text-moon-accent/60" size={32} />
                    <h1 className="text-xl font-light text-moon-accent tracking-widest">
                        管理後台
                    </h1>
                    <p className="text-moon-muted text-xs tracking-wide">
                        請輸入管理員密碼
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="密碼"
                        autoFocus
                        className="w-full bg-moon-dark border border-moon-border px-4 py-3 text-white text-sm focus:border-moon-accent outline-none transition-colors"
                    />

                    {error && (
                        <p className="text-red-400 text-xs text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !password.trim()}
                        className="w-full bg-moon-accent text-moon-black py-3 text-sm tracking-widest font-medium hover:bg-white transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin w-4 h-4 mx-auto" />
                        ) : (
                            '登入'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
