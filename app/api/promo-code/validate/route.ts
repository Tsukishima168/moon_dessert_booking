import { NextRequest, NextResponse } from 'next/server';
import { validatePromoCode } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { code, orderAmount } = await request.json();

    if (!code || !orderAmount) {
      return NextResponse.json(
        { 
          success: false, 
          message: '缺少必要參數' 
        },
        { status: 400 }
      );
    }

    // 驗證優惠碼
    const result = await validatePromoCode(code.toUpperCase().trim(), orderAmount);

    return NextResponse.json({
      success: result.valid,
      data: result,
      message: result.message,
    });
  } catch (error) {
    console.error('驗證優惠碼 API 錯誤:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '系統錯誤，請稍後再試' 
      },
      { status: 500 }
    );
  }
}
