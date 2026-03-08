import { NextRequest, NextResponse } from 'next/server'
import { ensureAdmin } from '@/app/api/admin/_utils/ensureAdmin'
import {
  listBanners,
  createBanner,
  editBanner,
  removeBanner,
} from '@/src/services/banner.service'

export const dynamic = 'force-dynamic'

const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// GET - 取得所有 Banner（含未啟用）
export async function GET() {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const data = await listBanners()
    return NextResponse.json(data)
  } catch (error) {
    console.error('API 錯誤 - 取得 Banner (admin):', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST - 新增 Banner
export async function POST(request: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const body = await request.json()
    const data = await createBanner(body)
    return NextResponse.json(data)
  } catch (error) {
    console.error('API 錯誤 - 新增 Banner:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PUT - 更新 Banner
export async function PUT(request: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const { id, ...updateData } = await request.json()
    if (!id) {
      return NextResponse.json({ error: '缺少 Banner ID' }, { status: 400 })
    }
    const data = await editBanner(id, updateData)
    return NextResponse.json(data)
  } catch (error) {
    console.error('API 錯誤 - 更新 Banner:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE - 刪除 Banner
export async function DELETE(request: NextRequest) {
  if (!(await ensureAdmin())) return unauthorized()
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: '缺少 Banner ID' }, { status: 400 })
    }
    await removeBanner(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API 錯誤 - 刪除 Banner:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
