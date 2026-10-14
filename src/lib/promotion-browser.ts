export async function copyPromotionCode(code: string): Promise<string> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(code)
    return '已複製優惠碼，結帳時貼上即可。'
  } catch { return `無法自動複製，請選取並複製 ${code}。` }
}
export function readDismissedPromotions(): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('dismissedBanners') ?? '[]')
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(-50) : [])
  } catch { return new Set() }
}
export function saveDismissedPromotions(value: Set<string>): void {
  try { localStorage.setItem('dismissedBanners', JSON.stringify(Array.from(value).slice(-50))) } catch {}
}
