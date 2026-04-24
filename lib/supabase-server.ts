import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

// Server-side Supabase client
// 用於 API Routes 和 Server Components
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = cookies();
  const headerStore = headers();
  const forwardedHost = headerStore.get('x-forwarded-host');
  const host = forwardedHost ?? headerStore.get('host') ?? '';
  const hostname = host.split(':')[0];
  const shouldShareAcrossSubdomains =
    hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                ...(shouldShareAcrossSubdomains ? { domain: '.kiwimu.com' } : {}),
              });
            });
          } catch {
            // 在唯讀上下文中（例如部分 Server Components）忽略 cookie 回寫
          }
      },
    },
  });
}
