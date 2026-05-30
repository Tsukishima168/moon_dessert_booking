import { NextRequest, NextResponse } from 'next/server'
import { unsubscribeByToken } from '@/src/repositories/marketing.repository'

export const dynamic = 'force-dynamic'

/**
 * 公開退訂端點：GET /api/unsubscribe?token=<uuid>
 * 以 token 將該 email 的 marketing_consent 設為 false，回傳簡單品牌頁。
 * token 為不可猜的 UUID，故免登入。
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return htmlResponse('連結無效', '退訂連結缺少參數。', 400)
  }

  let ok = false
  try {
    ok = await unsubscribeByToken(token)
  } catch (error) {
    console.error('API 錯誤 - 退訂:', error)
    return htmlResponse('系統錯誤', '處理退訂時發生錯誤，請稍後再試。', 500)
  }

  return ok
    ? htmlResponse('已取消訂閱', '您已成功取消訂閱月島甜點的優惠資訊。往後不會再收到行銷信件。', 200)
    : htmlResponse('連結無效或已失效', '找不到對應的訂閱，可能已退訂或連結已失效。', 404)
}

function htmlResponse(title: string, body: string, status: number) {
  const html = `<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex"/><title>${title}｜月島甜點</title><style>body{margin:0;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{max-width:420px;padding:48px 32px;text-align:center}.t{letter-spacing:.15em;font-weight:300;font-size:20px;margin-bottom:16px;color:#fff}.b{color:#999;font-size:14px;line-height:1.9}a{color:#d4af37;text-decoration:none}</style></head><body><div class="box"><div class="t">${title}</div><p class="b">${body}</p><p class="b" style="margin-top:24px"><a href="https://shop.kiwimu.com">返回月島甜點 →</a></p></div></body></html>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
