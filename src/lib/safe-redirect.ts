const FALLBACK_REDIRECT = '/account'
const SAFE_REDIRECT_BASE = 'https://shop.kiwimu.com'

export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback: string = FALLBACK_REDIRECT
): string {
  if (!value) return fallback

  try {
    const baseUrl = new URL(SAFE_REDIRECT_BASE)
    const candidate = new URL(value, baseUrl)

    if (candidate.origin !== baseUrl.origin) {
      return fallback
    }

    const path = `${candidate.pathname}${candidate.search}${candidate.hash}`
    if (!path.startsWith('/')) {
      return fallback
    }

    return path
  } catch {
    return fallback
  }
}
