const SHARED_COOKIE_DOMAIN = '.kiwimu.com';
const COOKIE_CHUNK_PREFIX = 'chunks:';
const MAX_COOKIE_CHUNK_LENGTH = 3500;
const MAX_COOKIE_CHUNKS = 20;
const IPV4_HOST_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export const PASSPORT_LOGIN_URL = 'https://passport.kiwimu.com';

function canShareKiwimuCookies(hostname: string): boolean {
  return hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveCookieDomain(hostname: string = window.location.hostname): string | undefined {
  if (!hostname || isLocalhost(hostname) || IPV4_HOST_PATTERN.test(hostname)) {
    return undefined;
  }

  return canShareKiwimuCookies(hostname) ? SHARED_COOKIE_DOMAIN : undefined;
}

function shouldUseSecureCookies(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readCookieRaw(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapeRegex(name)}=([^;]*)`));
  return match ? match[1] : null;
}

function writeCookieRaw(name: string, rawValue: string, domain?: string, maxAgeSec = 60 * 60 * 24 * 365) {
  const parts = [
    `${name}=${rawValue}`,
    'path=/',
    `max-age=${maxAgeSec}`,
    'SameSite=Lax',
  ];

  if (shouldUseSecureCookies()) {
    parts.push('Secure');
  }

  if (domain) {
    parts.push(`domain=${domain}`);
  }

  document.cookie = parts.join('; ');
}

function removeCookie(name: string, domain?: string) {
  const parts = [`${name}=`, 'path=/', 'max-age=0', 'SameSite=Lax'];

  if (shouldUseSecureCookies()) {
    parts.push('Secure');
  }

  if (domain) {
    parts.push(`domain=${domain}`);
  }

  document.cookie = parts.join('; ');
}

function clearCookieKey(name: string, domain?: string) {
  removeCookie(name, domain);
  for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
    removeCookie(`${name}.${index}`, domain);
  }
}

function readChunkedCookie(name: string): string | null {
  const meta = readCookieRaw(name);
  if (!meta) {
    return null;
  }

  if (!meta.startsWith(COOKIE_CHUNK_PREFIX)) {
    try {
      return decodeURIComponent(meta);
    } catch {
      return null;
    }
  }

  const chunkCount = Number(meta.slice(COOKIE_CHUNK_PREFIX.length));
  if (!Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > MAX_COOKIE_CHUNKS) {
    return null;
  }

  let combined = '';
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = readCookieRaw(`${name}.${index}`);
    if (chunk == null) {
      return null;
    }
    combined += chunk;
  }

  try {
    return decodeURIComponent(combined);
  } catch {
    return null;
  }
}

function writeChunkedCookie(name: string, value: string, domain?: string) {
  const encoded = encodeURIComponent(value);
  clearCookieKey(name, domain);

  if (encoded.length <= MAX_COOKIE_CHUNK_LENGTH) {
    writeCookieRaw(name, encoded, domain);
    return;
  }

  const chunks = encoded.match(new RegExp(`.{1,${MAX_COOKIE_CHUNK_LENGTH}}`, 'g')) ?? [];
  if (chunks.length > MAX_COOKIE_CHUNKS) {
    throw new Error(`Cookie storage overflow for ${name}`);
  }

  writeCookieRaw(name, `${COOKIE_CHUNK_PREFIX}${chunks.length}`, domain);
  chunks.forEach((chunk, index) => {
    writeCookieRaw(`${name}.${index}`, chunk, domain);
  });
}

export function createSharedAuthStorage() {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const domain = resolveCookieDomain();

  return {
    getItem: (key: string): string | null => readChunkedCookie(key),
    setItem: (key: string, value: string) => writeChunkedCookie(key, value, domain),
    removeItem: (key: string) => clearCookieKey(key, domain),
  };
}

export function buildPassportLoginUrl(returnTo: string = window.location.href): string {
  const url = new URL(PASSPORT_LOGIN_URL);
  url.searchParams.set('redirect_to', returnTo);
  return url.toString();
}
