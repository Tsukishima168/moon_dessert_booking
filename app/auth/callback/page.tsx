'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Client-side auth callback page.
 * 
 * 為什麼要在客戶端完成 code exchange？
 * - Navbar / checkout 使用 supabase-js，session 存在 localStorage。
 * - 若在 Server Route Handler (server-auth) 完成 exchange，session 寫入 HttpOnly Cookie，
 *   但客戶端的 supabase-js 讀不到，導致登入後仍顯示未登入。
 * - 在此頁面 (Client Component) 裡呼叫 exchangeCodeForSession，
 *   supabase-js 會將 session 寫入 localStorage，讓全站 Client Component 正常讀取。
 */
export default function AuthCallbackPage() {
    const router = useRouter();

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('code');

        if (code) {
            supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
                if (error) {
                    console.error('Auth callback error:', error.message);
                }
                // 無論成功或失敗都回首頁，supabase-js 的 onAuthStateChange 會廣播新狀態
                router.replace('/');
            });
        } else {
            // 沒有 code（例如 magic link 點擊後直接帶 token）
            // supabase-js detectSessionInUrl 會自動處理，直接跳回首頁
            router.replace('/');
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-moon-black flex items-center justify-center">
            <p className="text-moon-muted text-sm tracking-widest animate-pulse">
                驗證中，請稍候...
            </p>
        </div>
    );
}
