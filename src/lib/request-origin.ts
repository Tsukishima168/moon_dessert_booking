/** Cookie-authenticated writes must originate from this exact Shop origin. */
export function isSameOriginMutation(request: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) return true
  const origin = request.headers.get('origin')
  if (!origin || origin === 'null') return false
  try {
    const source = new URL(origin)
    return source.origin === origin && source.origin === new URL(request.url).origin
  } catch {
    return false
  }
}
