const SHARED_COOKIE_DOMAIN = '.kiwimu.com';
const COOKIE_CHUNK_PREFIX = 'chunks:';
const MAX_COOKIE_CHUNK_LENGTH = 3500;
const MAX_COOKIE_CHUNKS = 20;
const IPV4_HOST_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export const PASSPORT_LOGIN_URL = 'https://passport.kiwimu.com';
export const PASSPORT_AUTH_COMPLETE_EVENT = 'kiwimu:passport-auth-complete';
export const PASSPORT_SSO_MESSAGE_TYPE = 'kiwimu:sso:complete';

export type PassportLoginPresentation = 'redirect' | 'popup';

export interface PassportLoginUrlOptions {
  presentation?: PassportLoginPresentation;
  intent?: string;
  sourceSite?: string;
}

export interface PassportSsoMessage {
  type: typeof PASSPORT_SSO_MESSAGE_TYPE;
  status: 'success' | 'error';
  redirectTo?: string;
  message?: string;
}

export interface OpenPassportLoginOptions extends PassportLoginUrlOptions {
  returnTo?: string;
  onComplete?: (message: PassportSsoMessage) => void;
  onError?: (message: PassportSsoMessage) => void;
}

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

export function buildPassportLoginUrl(
  returnTo: string = window.location.href,
  options: PassportLoginUrlOptions = {}
): string {
  const url = new URL(PASSPORT_LOGIN_URL);
  url.searchParams.set('redirect_to', returnTo);
  url.searchParams.set('mode', 'sso');
  if (options.presentation) {
    url.searchParams.set('presentation', options.presentation);
  }
  if (options.intent) {
    url.searchParams.set('intent', options.intent);
  }
  if (options.sourceSite) {
    url.searchParams.set('source_site', options.sourceSite);
  }
  return url.toString();
}

function buildPopupFeatures(): string {
  const width = 460;
  const height = 680;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  return [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');
}

export function openPassportLogin(options: OpenPassportLoginOptions = {}): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const {
    returnTo = window.location.href,
    onComplete,
    onError,
    ...urlOptions
  } = options;
  const sourceSite = urlOptions.sourceSite || 'shop';
  const popupUrl = buildPassportLoginUrl(returnTo, {
    ...urlOptions,
    sourceSite,
    presentation: 'popup',
  });

  const popup = window.open(popupUrl, 'kiwimu-passport-login', buildPopupFeatures());
  if (!popup) {
    onError?.({
      type: PASSPORT_SSO_MESSAGE_TYPE,
      status: 'error',
      message: '瀏覽器阻擋了登入視窗，請允許彈出視窗後再試一次。',
    });
    return false;
  }

  const expectedOrigin = new URL(PASSPORT_LOGIN_URL).origin;
  let settled = false;
  let pollTimer = 0;

  const cleanup = () => {
    window.removeEventListener('message', handleMessage);
    if (pollTimer) {
      window.clearInterval(pollTimer);
    }
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== expectedOrigin) return;
    const message = event.data as Partial<PassportSsoMessage> | null;
    if (!message || message.type !== PASSPORT_SSO_MESSAGE_TYPE) return;

    settled = true;
    cleanup();
    popup.close();

    const detail = message as PassportSsoMessage;
    if (detail.status === 'success') {
      window.dispatchEvent(new CustomEvent(PASSPORT_AUTH_COMPLETE_EVENT, { detail }));
      onComplete?.(detail);
    } else {
      onError?.(detail);
    }
  };

  window.addEventListener('message', handleMessage);
  pollTimer = window.setInterval(() => {
    if (popup.closed && !settled) {
      settled = true;
      cleanup();
      onError?.({
        type: PASSPORT_SSO_MESSAGE_TYPE,
        status: 'error',
        message: '登入視窗已關閉，請再試一次。',
      });
    }
  }, 500);
  popup.focus();
  return true;
}
