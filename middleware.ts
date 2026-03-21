import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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

  return supabaseResponse;
}

export const config = {
  matcher: [
    // 排除靜態資源、_next、auth callback
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
