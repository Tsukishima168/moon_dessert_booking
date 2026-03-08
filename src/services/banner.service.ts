import {
  findAllBanners,
  insertBanner,
  updateBanner,
  deleteBanner,
  type BannerRow,
  type InsertBannerPayload,
} from '@/src/repositories/banner.repository'

/**
 * 列出所有 Banner（含未啟用）
 */
export async function listBanners(): Promise<BannerRow[]> {
  return findAllBanners()
}

/**
 * 新增 Banner
 * @param body - 前端傳入的 Banner 資料
 * @returns 新建的 BannerRow
 */
export async function createBanner(
  body: Record<string, unknown>
): Promise<BannerRow> {
  const payload: InsertBannerPayload = {
    title: body.title as string,
    description: (body.description as string) ?? null,
    image_url: (body.image_url as string) ?? null,
    link_url: (body.link_url as string) ?? null,
    link_text: (body.link_text as string) ?? '立即查看',
    background_color: (body.background_color as string) ?? '#d4a574',
    text_color: (body.text_color as string) ?? '#0a0a0a',
    is_active: (body.is_active as boolean) ?? false,
    priority: (body.priority as number) ?? 0,
    display_type: (body.display_type as string) ?? 'hero',
    start_date: (body.start_date as string) ?? null,
    end_date: (body.end_date as string) ?? null,
  }
  return insertBanner(payload)
}

/**
 * 更新 Banner
 * @param id - Banner UUID
 * @param updateData - 要更新的欄位
 * @returns 更新後的 BannerRow
 */
export async function editBanner(
  id: string,
  updateData: Record<string, unknown>
): Promise<BannerRow> {
  return updateBanner(id, {
    ...updateData,
    updated_at: new Date().toISOString(),
  })
}

/**
 * 刪除 Banner
 * @param id - Banner UUID
 */
export async function removeBanner(id: string): Promise<void> {
  return deleteBanner(id)
}
