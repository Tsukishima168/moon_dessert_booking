import { createHmac } from 'crypto'
/** Rotating one-minute key; no raw IP is persisted or sent to the client. */
export function bannerStatRateKey(request: Request, now = Date.now()): string | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) return null
  // Vercel's platform header is distinct from a caller-supplied forwarded header.
  // Self-hosted/local previews use one shared bucket instead of trusting proxy headers.
  const identity = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') ?? 'unknown' : 'local'
  return createHmac('sha256', secret).update(`shop-banner-stat-v1:${Math.floor(now / 60000)}:`).update(identity.slice(0, 256)).digest('hex')
}
