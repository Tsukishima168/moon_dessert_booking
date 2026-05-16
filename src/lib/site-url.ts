import { NextRequest } from 'next/server';

const DEV_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
]);

function normalizeBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('NEXT_PUBLIC_SITE_URL must use http or https');
  }
  return parsed.origin.replace(/\/$/, '');
}

function isAllowedFallbackHost(host: string): boolean {
  const hostname = (() => {
    try {
      return new URL(`http://${host}`).hostname.replace(/^\[|\]$/g, '');
    } catch {
      return host.split(':')[0] ?? host;
    }
  })();
  if (process.env.NODE_ENV !== 'production' && DEV_HOSTS.has(hostname)) {
    return true;
  }

  const allowlist = (process.env.PUBLIC_SITE_HOST_ALLOWLIST ?? 'shop.kiwimu.com')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(host.toLowerCase()) || allowlist.includes(hostname.toLowerCase());
}

export function getPublicSiteUrl(request: NextRequest): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL is required in production');
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const fallbackHost = forwardedHost || request.nextUrl.host;
  if (!isAllowedFallbackHost(fallbackHost)) {
    throw new Error(`Untrusted public site host: ${fallbackHost}`);
  }

  const fallbackProto = forwardedProto || request.nextUrl.protocol.replace(':', '');
  return normalizeBaseUrl(`${fallbackProto}://${fallbackHost}`);
}
