import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSameOriginMutation } from '@/src/lib/request-origin';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const cookieWrite = path.startsWith('/api/admin/') || path.startsWith('/api/user/') ||
    path === '/api/auth/set-session' || path === '/api/order' || path === '/api/payment/linepay/request';
  // An arbitrary RSC header must not bypass the write guard.
  if (cookieWrite && !isSameOriginMutation(request)) {
    return NextResponse.json({ success: false, message: '請從本站重新操作。' }, { status: 403 });
  }
  // 跳過 Next.js 內部 RSC 導航請求，避免攔截造成 "access control checks" 錯誤
  if (request.headers.get('rsc') === '1') {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          const hostname = request.nextUrl.hostname;
          const shouldShareAcrossSubdomains =
            hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');

          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              ...(shouldShareAcrossSubdomains ? { domain: '.kiwimu.com' } : {}),
            })
          );
        },
      },
    }
  );

  // 刷新 session（必要，不可省略）
  await supabase.auth.getUser();

  if (
    request.nextUrl.pathname.startsWith('/api/admin') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/api/user')
  ) {
    supabaseResponse.headers.set('Cache-Control', 'no-store, max-age=0');
    supabaseResponse.headers.set('Pragma', 'no-cache');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 排除靜態資源、_next、auth callback
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
