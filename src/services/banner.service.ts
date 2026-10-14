import { findAllBanners, findBannerById, insertBanner, updateBanner, deleteBanner, type BannerRow } from '@/src/repositories/banner.repository'
import { normalizeBannerConfig, PromotionInputError } from '@/src/lib/promotion-config'
export async function listBanners(): Promise<BannerRow[]> { return findAllBanners() }
export async function createBanner(body: Record<string, unknown>): Promise<BannerRow> {
  return insertBanner(normalizeBannerConfig(body))
}
export async function editBanner(id: string, body: Record<string, unknown>): Promise<BannerRow> {
  const existing = await findBannerById(id)
  if (!existing) throw new PromotionInputError('找不到此公告。')
  // Counters, IDs and creation timestamps are never accepted from this form.
  return updateBanner(id, { ...normalizeBannerConfig({ ...existing, ...body }), updated_at: new Date().toISOString() })
}
export async function removeBanner(id: string): Promise<void> { return deleteBanner(id) }
