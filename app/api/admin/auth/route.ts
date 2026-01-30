import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/auth - 驗證後台密碼
export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        // 從環境變數取得密碼，預設為 'admin123'
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        if (password === adminPassword) {
            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { success: false, message: '密碼錯誤' },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, message: '驗證失敗' },
            { status: 500 }
        );
    }
}
