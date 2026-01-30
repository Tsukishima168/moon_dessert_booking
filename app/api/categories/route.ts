import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/supabase';

// GET /api/categories - 取得分類列表
export async function GET() {
  try {
    const categories = await getCategories();
    
    return NextResponse.json({
      success: true,
      data: categories,
      message: '成功取得分類資料',
    });
  } catch (error) {
    console.error('API 錯誤 - 取得分類:', error);
    
    return NextResponse.json(
      {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : '取得分類資料失敗',
      },
      { status: 500 }
    );
  }
}
