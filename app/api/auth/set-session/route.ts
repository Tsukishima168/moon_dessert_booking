import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/set-session
 *
 * Client-side callback 完成 exchangeCodeForSession 後呼叫此 API，
 * 讓 Server 端也能透過 SSR Cookie 讀取到 session。
 *
 * Client 端的 supabase-js 已經把 session 存到 localStorage，
 * 這個 API 純粹是為了讓 Server Components (admin layout 等) 也能看到 session。
 */
export async function POST(request: NextRequest) {
    try {
        const { access_token, refresh_token } = await request.json();

        if (!access_token || !refresh_token) {
            return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
        }

        const response = NextResponse.json({ success: true });
        const hostname = request.nextUrl.hostname;
        const shouldShareAcrossSubdomains =
            hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, {
                                ...options,
                                ...(shouldShareAcrossSubdomains ? { domain: '.kiwimu.com' } : {}),
                            })
                        );
                    },
                },
            }
        );

        // 設定 session → supabase SSR 會自動將 token 寫入 response cookies
        await supabase.auth.setSession({ access_token, refresh_token });

        return response;
    } catch (error) {
        console.error('POST /api/auth/set-session error:', error);
        return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const response = NextResponse.json({ success: true });
    const hostname = request.nextUrl.hostname;
    const shouldShareAcrossSubdomains =
        hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');

    const cookieOptions = {
        path: '/',
        maxAge: 0,
        ...(shouldShareAcrossSubdomains ? { domain: '.kiwimu.com' } : {}),
    };

    request.cookies
        .getAll()
        .filter(({ name }) => name.startsWith('sb-'))
        .forEach(({ name }) => {
            response.cookies.set(name, '', cookieOptions);
        });

    return response;
}
