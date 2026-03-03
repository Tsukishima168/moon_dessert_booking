import { createAuthClient } from '@/lib/supabase/server-auth';

export async function ensureAdmin(): Promise<boolean> {
    const supabase = await createAuthClient();
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error || !session) {
        return false;
    }

    const role = (session.user.app_metadata?.role || session.user.user_metadata?.role || '')
        .toString()
        .toLowerCase();

    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
    const userEmail = (session.user.email || '').toLowerCase();

    return role === 'admin' || adminEmails.includes(userEmail);
}
