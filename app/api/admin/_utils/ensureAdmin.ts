import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';

export async function ensureAdmin(): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    if (!token) return false;

    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('admin_sessions')
            .select('token')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        return !error && !!data;
    } catch {
        return false;
    }
}
