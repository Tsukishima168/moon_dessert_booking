import { NextRequest, NextResponse } from 'next/server';
import { applyPromoCode } from '@/src/services/order.service';

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

    // 使用 admin client 驗證優惠碼（繞過 RLS）
    const result = await applyPromoCode(code.toUpperCase().trim(), orderAmount);

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
