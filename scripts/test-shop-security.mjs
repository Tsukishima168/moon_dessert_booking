import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

// Run source with in-memory dependencies only: no database, provider, email or login.
const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const nativeRequire = createRequire(import.meta.url);
const quiet = { log() {}, warn() {}, error() {} };
function load(file, stubs = {}, env = {}, cache = new Map()) {
  const path = resolve(root, file);
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const source = readFileSync(path, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } });
  vm.runInNewContext(outputText, {
    module, exports: module.exports, process: { env }, console: quiet,
    Buffer, URL, URLSearchParams, Date, Object, Request, Response,
    require: name => {
      if (Object.hasOwn(stubs, name)) return stubs[name];
      if (['crypto', 'node:crypto', 'parse5'].includes(name)) return nativeRequire(name);
      if (name.startsWith('@/') || name.startsWith('.')) {
        const target = name.startsWith('@/') ? resolve(root, name.slice(2)) : resolve(dirname(path), name);
        const alias = `@/${target.slice(root.length + 1)}`;
        if (Object.hasOwn(stubs, alias)) return stubs[alias];
        return load(`${target}.ts`, stubs, env, cache);
      }
      throw new Error(`Unexpected external dependency: ${name}`);
    },
  }, { filename: file });
  return module.exports;
}
const env = { ORDER_SUCCESS_TOKEN_SECRET: 'offline-only-fixture-signing-key',
  LINEPAY_CHANNEL_ID: 'fixture-id', LINEPAY_CHANNEL_SECRET: 'fixture-secret' };
function request(path, method = 'POST', body = {}, origin = 'https://shop.kiwimu.com', cookies = {}) {
  const req = new Request(`https://shop.kiwimu.com${path}`, {
    method, headers: origin == null ? {} : { origin, 'Content-Type': 'application/json' },
    ...(['GET', 'HEAD'].includes(method) ? {} : { body: JSON.stringify(body) }),
  });
  req.nextUrl = new URL(req.url);
  req.cookies = { get: name => cookies[name] ? { value: cookies[name] } : undefined,
    getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })) };
  return req;
}
const next = { NextResponse: {
  json(body, options = {}) {
    const response = new Response(JSON.stringify(body), { status: options.status ?? 200 });
    response.cookieWrites = [];
    response.cookies = { set: (...args) => response.cookieWrites.push(args) };
    return response;
  },
  redirect(url) { return new Response(null, { status: 307, headers: { location: url } }); },
  next() { return { cookies: { set() {} }, headers: new Headers() }; },
} };
function query(result) {
  const builder = { then: (yes, no) => Promise.resolve(result).then(yes, no),
    single: async () => result, maybeSingle: async () => result };
  for (const key of ['select', 'eq', 'lt', 'gt', 'is', 'order', 'limit']) builder[key] = () => builder;
  return builder;
}

const { csvEscape } = load('src/lib/csv-cell.ts');
for (const value of ['=1+1', '+SUM(1,2)', '-1+2', '@SUM(1)', '\t=1', '\r\n+1', '\u0000@1', '\uFEFF=1']) {
  const cell = csvEscape(value);
  const decoded = cell.startsWith('"') ? cell.slice(1, -1).replaceAll('""', '"') : cell;
  assert.equal(decoded, `'${value}`);
}
assert.equal(csvEscape(-99), '-99');
assert.equal(csvEscape('正常甜點'), '正常甜點');
assert.equal(csvEscape('a,b"c\r\nd'), '"a,b""c\r\nd"');

let sends = 0;
const dispatcher = load('src/services/marketing/dispatcher.ts', {
  '@/lib/email/resend': { sendEmail: async () => { sends++; return true; } },
});
const hostile = '<a href="https://example.invalid">假通知</a> & $& {order_id}';
const rendered = dispatcher.renderTemplate({ title: '{customer_name}', message: '<p>{customer_name}</p>' }, { customer_name: hostile });
assert.ok(rendered.html.startsWith('<p>&lt;a href=&quot;'));
assert.ok(rendered.html.includes('$&amp; {order_id}'));
assert.equal(rendered.subject, hostile);
assert.equal(dispatcher.renderTemplate({ title: '{constructor}', message: '<b>{missing}</b>' }).html, '<b></b>');
for (const message of ['<a href="{customer_name}">link</a>', '<a title=">{customer_name}">x</a>', '<style>{customer_name}</style>',
  '<a title=foo" href={customer_name}>Read</a>', '<style>{customer_name}', '<script>{customer_name}',
  '<!-- {customer_name} -->', '<svg><text>{customer_name}</text></svg>', '<a title="{customer_name}']) {
  assert.throws(() => dispatcher.renderTemplate({ title: 'test', message }, { customer_name: hostile }));
}
assert.equal(dispatcher.renderTemplate({ title: '{customer_name}', message: '<b>歡迎</b>' }, { customer_name: 'a\r\nb' }).subject, 'a  b');
const { renderEmailTextTemplate } = load('lib/email/html.ts');
assert.equal(renderEmailTextTemplate('<!doctype html><html><body><p>{customer_name}</p></body></html>', { customer_name: '正常顧客 & 測試' }), '<!doctype html><html><body><p>正常顧客 &amp; 測試</p></body></html>');
assert.equal((await dispatcher.sendViaChannel('email', 'fixture@example.invalid', rendered, { unsubscribeToken: '' })).ok, false);
assert.equal(sends, 0);
const enabled = load('src/services/marketing/dispatcher.ts', {
  '@/lib/email/resend': { sendEmail: async () => { sends++; return true; } },
}, { SHOP_MARKETING_SEND_ENABLED: 'true' });
assert.equal((await enabled.sendViaChannel('email', 'fixture@example.invalid', rendered, { unsubscribeToken: 'fixture-token' })).ok, true);
assert.equal(sends, 1);
const noRepository = new Proxy({}, { get() { throw new Error('Disabled engine reached database'); } });
const campaigns = load('src/services/marketing/campaign.service.ts', {
  '@/src/repositories/marketing.repository': noRepository, './dispatcher': dispatcher,
});
assert.equal((await campaigns.runDueCampaigns()).disabled, true);
await assert.rejects(campaigns.runCampaign({ id: 'fixture' }), /暫停/);
const automation = load('src/services/marketing/automation.service.ts', {
  '@/src/repositories/marketing.repository': noRepository, './dispatcher': dispatcher,
});
await automation.runOrderAutomation('fixture@example.invalid', {});

const { isSameOriginMutation } = load('src/lib/request-origin.ts');
for (const origin of ['https://blog.kiwimu.com', 'https://shop.kiwimu.com.evil.invalid', 'null', null, 'https://shop.kiwimu.com/path']) {
  assert.equal(isSameOriginMutation(request('/api/admin/menu', 'POST', {}, origin)), false);
}
assert.equal(isSameOriginMutation(request('/api/admin/menu')), true);
assert.equal(isSameOriginMutation(new Request('http://localhost:5226/api/admin/upload', { method: 'POST', headers: { origin: 'http://localhost:5226', 'Content-Type': 'multipart/form-data' } })), true);
assert.equal(isSameOriginMutation(new Request('https://fixture.vercel.app/api/admin/menu', { method: 'POST', headers: { origin: 'https://fixture.vercel.app' } })), true);
const middleware = load('middleware.ts', {
  'next/server': next, '@supabase/ssr': { createServerClient() { throw new Error('Rejected request reached session'); } },
});
const cross = request('/api/admin/menu', 'POST', {}, 'https://blog.kiwimu.com');
cross.headers.set('rsc', '1');
assert.equal((await middleware.middleware(cross)).status, 403);

const paymentTokens = load('src/lib/order-payment-token.ts', {}, env);
const orderId = 'ORD-ABCDEF0123456789';
const paymentToken = paymentTokens.generateOrderPaymentToken(orderId);
assert.equal(paymentTokens.verifyOrderPaymentToken(orderId, paymentToken), true);
assert.equal(paymentTokens.verifyOrderPaymentToken('ORD-OTHER', paymentToken), false);
assert.equal(paymentTokens.verifyOrderPaymentToken(orderId, paymentToken.replace(/.$/, 'x')), false);
assert.equal(paymentTokens.verifyOrderPaymentToken(orderId, `1000000000000.${'0'.repeat(64)}`), false);
assert.equal(paymentTokens.verifyOrderPaymentToken(orderId, '{}'), false);
assert.equal(load('src/lib/order-payment-token.ts').verifyOrderPaymentToken(orderId, paymentToken), false);
assert.equal(load('src/lib/order-success-token.ts', {}, env).verifyOrderSuccessToken(orderId, paymentToken).valid, false);

let providerCalls = 0;
let currentUser = null;
let order = { order_id: orderId, user_id: 'fixture-owner', final_price: 99, total_price: 999,
  status: 'paid', items: [{ name: 'fixture', price: 99, quantity: 1 }], linepay_transaction_id: 'fixture-transaction' };
const paymentStubs = {
  'next/server': next,
  '@/lib/supabase-admin': { createAdminClient: () => ({ from: () => ({
    ...query({ data: order, error: null }), update: () => query({ data: { order_id: orderId }, error: null }),
  }) }) },
  '@/lib/supabase-server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser }, error: null }) } }) },
  '@/app/api/admin/_utils/ensureAdmin': { ensureAdmin: async () => false },
  '@/src/services/settings.service': { getPaymentSettings: async () => ({}), canUseLinePay: () => true },
  '@/src/lib/site-url': { getPublicSiteUrl: () => 'https://shop.kiwimu.com' },
  '@/lib/linepay': { getLinePayClient: () => ({
    requestPayment: async payload => { providerCalls++; assert.equal(payload.amount, 99); return { returnCode: '0000', info: { transactionId: 'fixture-transaction', paymentUrl: { web: 'https://example.invalid/payment' } } }; },
    confirmPayment: async () => { providerCalls++; throw new Error('This control must not confirm payment'); },
  }) },
  '@/src/services/order-status-side-effects.service': { runOrderStatusSideEffects: async () => { throw new Error('Unexpected side effect'); } },
};
const paymentRoute = load('app/api/payment/linepay/request/route.ts', paymentStubs, env);
let response = await paymentRoute.POST(request('/api/payment/linepay/request', 'POST', { orderId }));
assert.equal(response.status, 403);
assert.equal((await response.json()).orderSuccessUrl, undefined);
currentUser = { id: 'someone-else' };
assert.equal((await paymentRoute.POST(request('/api/payment/linepay/request', 'POST', { orderId }))).status, 403);
currentUser = { id: 'fixture-owner' };
response = await paymentRoute.POST(request('/api/payment/linepay/request', 'POST', { orderId }));
assert.equal(response.status, 409);
assert.ok((await response.json()).orderSuccessUrl.includes('&t='));
currentUser = null;
const cookie = { [paymentTokens.orderPaymentCookieName(orderId)]: paymentToken };
order = { ...order, status: 'pending', user_id: null };
assert.equal((await paymentRoute.POST(request('/api/payment/linepay/request', 'POST', { orderId, amount: 1 }, undefined, cookie))).status, 400);
assert.equal(providerCalls, 0);
assert.equal((await paymentRoute.POST(request('/api/payment/linepay/request', 'POST', { orderId, amount: 99 }, undefined, cookie))).status, 200);
assert.equal(providerCalls, 1);
order.status = 'cancelled';
assert.equal((await paymentRoute.POST(request('/api/payment/linepay/request', 'POST', { orderId }, undefined, cookie))).status, 422);
const confirm = load('app/api/payment/linepay/confirm/route.ts', paymentStubs, env);
response = await confirm.GET(request(`/api/payment/linepay/confirm?orderId=${orderId}&transactionId=fixture-transaction`, 'GET'));
assert.ok(response.headers.get('location').includes('payment_not_verified'));
assert.equal(providerCalls, 1);

let sessionCalls = 0;
let sessionResult = { data: { user: null, session: null }, error: { message: 'fixture rejection' } };
const sessions = load('app/api/auth/set-session/route.ts', { 'next/server': next, '@supabase/ssr': {
  createServerClient: (_url, _key, options) => ({ auth: { setSession: async () => {
    sessionCalls++; options.cookies.setAll([{ name: 'sb-fixture', value: 'fixture', options: {} }]); return sessionResult;
  } } }),
} });
assert.equal((await sessions.POST(request('/api/auth/set-session', 'POST', { access_token: 'fixture', refresh_token: 'fixture' }, 'https://blog.kiwimu.com'))).status, 403);
assert.equal(sessionCalls, 0);
response = await sessions.POST(request('/api/auth/set-session', 'POST', { access_token: 'fixture', refresh_token: 'fixture' }));
assert.equal(response.status, 401);
assert.equal(response.cookieWrites.length, 0);
sessionResult = { data: { user: { id: 'fixture' }, session: {} }, error: null };
assert.equal((await sessions.POST(request('/api/auth/set-session', 'POST', { access_token: 'fixture', refresh_token: 'fixture' }))).status, 200);
assert.equal((await sessions.DELETE(request('/api/auth/set-session', 'DELETE', {}, null))).status, 403);

const { releasePromoUsage } = load('src/lib/promo-usage.ts');
let count = 1, updates = 0;
const promoDb = { from: () => ({
  select: () => query({ data: { used_count: count }, error: null }),
  update: payload => {
    updates++;
    if (updates === 1) count++; // another order reserves after our read
    let expected;
    const update = { eq: (key, value) => { if (key === 'used_count') expected = value; return update; },
      select: () => update, maybeSingle: async () => {
        if (count !== expected) return { data: null, error: null };
        count = payload.used_count; return { data: { id: 'fixture' }, error: null };
      } };
    return update;
  },
}) };
assert.equal(await releasePromoUsage(promoDb, 'fixture'), true);
assert.equal(count, 1); // other successful order is preserved
let uncertainUpdates = 0;
const ambiguousDb = { from: () => ({ select: () => query({ data: { used_count: 2 }, error: null }),
  update: () => { uncertainUpdates++; return query({ data: null, error: { message: 'Network failure after commit' } }); },
}) };
assert.equal(await releasePromoUsage(ambiguousDb, 'fixture'), false);
assert.equal(uncertainUpdates, 1);

let released = 0, insertMode = 'unknown', persisted;
const fixturePromo = { id: 'fixture-promo', used_count: 1, max_uses: 20, is_active: true,
  valid_from: null, valid_until: null, discount_type: 'fixed', discount_value: 10, min_order_amount: 0 };
const serviceDb = {
  from: table => {
    if (table === 'menu_items') return query({ data: [{ id: 'menu', name: 'fixture-dessert', is_available: true }], error: null });
    if (table === 'menu_variants') return query({ data: [{ id: 'variant', menu_item_id: 'menu', variant_name: '標準', price: 99 }], error: null });
    assert.equal(table, 'promo_codes');
    return { ...query({ data: fixturePromo, error: null }), update: () => query({ data: { id: fixturePromo.id }, error: null }) };
  },
  rpc: async name => ({ data: [name === 'validate_reservation' ? { valid: true } : { available: true }], error: null }),
};
const service = load('src/services/order.service.ts', {
  '@/lib/supabase-admin': { createAdminClient: () => serviceDb },
  '@/src/repositories/order.repository': { insertOrder: async payload => {
    persisted = payload;
    if (insertMode === 'unknown') throw new Error('Lost acknowledgment');
    if (insertMode === 'rejected') throw { code: 'P0001' };
    return payload;
  } },
  '@/src/lib/promo-usage': { releasePromoUsage: async () => { released++; return true; } },
  '@/src/lib/event-bus': { EventBus: { emit: async () => {} } },
  '@/src/services/settings.service': {
    getDeliverySettings: async () => ({ pickup_available: true, delivery_available: true, delivery_fee: 150, free_delivery_threshold: 2000 }),
    getOrderRules: async () => ({ minimum_order_amount: 0 }),
    getBusinessHours: async () => ({ closed_days: [], special_closures: [] }),
  },
});
const orderInput = { customer_name: 'fixture customer', phone: '1234567890', pickup_time: '2099-01-02 12:00',
  items: [{ id: 'menu-variant', name: 'fixture-dessert', quantity: 1, price: 1 }],
  promo_code: 'FIXTURE', total_price: 1, payment_date: '2099-01-01' };
await assert.rejects(service.createOrder(orderInput, null), error => error.name === 'OrderPersistenceUncertainError');
assert.equal(released, 0); // unknown commit retains reservation
assert.equal(persisted.payment_date, null);
assert.equal(persisted.final_price, 89);
insertMode = 'rejected';
await assert.rejects(service.createOrder(orderInput, null), error => error.name === 'OrderValidationError');
assert.equal(released, 1); // only a confirmed transactional rejection releases once
insertMode = 'success';
assert.equal((await service.createOrder(orderInput, 'fixture-owner')).finalPrice, 89);
assert.equal(released, 1);
assert.equal(persisted.user_id, 'fixture-owner');

const createRoute = load('app/api/order/route.ts', {
  'next/server': next,
  '@/lib/supabase-server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
  '@/src/services/order.service': { ...service, createOrder: async () => ({ orderId, finalPrice: 99 }) },
  '@/src/repositories/marketing.repository': { setConsent: async () => {} },
}, { ...env, NODE_ENV: 'production' });
response = await createRoute.POST(request('/api/order', 'POST', orderInput));
assert.equal(response.status, 200);
assert.equal(response.cookieWrites.length, 1);
const [cookieName, value, options] = response.cookieWrites[0];
assert.equal(cookieName, paymentTokens.orderPaymentCookieName(orderId));
assert.equal(paymentTokens.verifyOrderPaymentToken(orderId, value), true);
assert.equal(options.httpOnly, true);
assert.equal(options.secure, true);
assert.equal(options.sameSite, 'strict');
assert.equal(options.path, '/api/payment/linepay/request');
assert.equal((await response.json()).payment_token, undefined);
const postWriteErrorRoute = load('app/api/order/route.ts', {
  'next/server': next,
  '@/lib/supabase-server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
  '@/src/services/order.service': { ...service, createOrder: async () => ({ orderId, finalPrice: 99 }) },
  '@/src/repositories/marketing.repository': { setConsent: async () => {} },
  '@/src/lib/order-payment-token': { generateOrderPaymentToken() { throw new service.OrderValidationError('post-write failure'); } },
}, env);
response = await postWriteErrorRoute.POST(request('/api/order', 'POST', orderInput));
assert.equal(response.status, 500);
assert.ok((await response.json()).message.includes('避免重複下單'));

// Verify every local admin write entry has a Request-aware auth or delegates to one.
function routes(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(x => x.isDirectory() ? routes(resolve(dir, x.name)) : x.name === 'route.ts' ? [resolve(dir, x.name)] : []); }
for (const file of routes(resolve(root, 'app/api/admin'))) {
  const source = readFileSync(file, 'utf8');
  if (!/export async function (POST|PUT|PATCH|DELETE)/.test(source)) continue;
  assert.ok(/ensureAdmin\((req|request)\)|isSameOriginMutation\(request\)|patchOrderRoute\(request/.test(source), file);
}
const config = readFileSync(resolve(root, 'lib/supabase.ts'), 'utf8');
assert.ok(config.includes('detectSessionInUrl: false'));
assert.ok(config.includes("flowType: 'pkce'"));
console.log('PASS: CSV, marketing escaping/context/gates, same-origin+RSC, order-bound payment authorization, amount/status controls, session verification and concurrent promo rollback. All dependencies mocked; no live writes.');
