import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with admin privileges (Service Role)
// ⚠️ 警告：這個 client 擁有繞過 RLS 的最高權限，只能在受到保護的 Admin API Route 中使用！
// 絕對不要將此 client 暴露給前端或未授權的 API！
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase Service Role Key or URL for admin client');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        },
    });
}
