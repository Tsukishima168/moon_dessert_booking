// GA4 entry_from 的小型 node 檢查（shop 沒有測試 runner）。
// 用法：node scripts/check-entry-from.mjs
// 把 lib/ga-hosts.ts（連同它引用的 src/lib/attribution.ts）轉成 CJS，取出實際會輸出到 <head> 的
// buildGaBootstrapScript(true)，放進 vm 並 stub window/document/Date，驗證 gtag('config') 的參數。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const load = (rel, requireMap = {}) => {
  const src = readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)((id) => requireMap[id], module.exports, module);
  return module.exports;
};

const attribution = load('src/lib/attribution.ts');
const { buildGaBootstrapScript } = load('lib/ga-hosts.ts', { '@/src/lib/attribution': attribution });

const NOW = 1_800_000_000_000;
const MIN = 60 * 1000;

/** 跑 bootstrap script，回傳 gtag('config', …) 的第三個參數（沒有 config 呼叫則回傳 null）。 */
function run({ hostname = 'shop.kiwimu.com', search = '', initialSearch, cookie, enabled = true } = {}) {
  class FakeDate extends Date {
    static now() {
      return NOW;
    }
  }
  const sandbox = {
    Date: FakeDate,
    URLSearchParams,
    document: { cookie: cookie ? `kw_attr=${encodeURIComponent(JSON.stringify(cookie))}` : '' },
    location: { hostname, pathname: '/menu', search },
  };
  sandbox.window = sandbox;
  sandbox.window.location = sandbox.location;
  if (initialSearch !== undefined) sandbox.__SHOP_INITIAL_SEARCH__ = initialSearch;
  vm.runInNewContext(buildGaBootstrapScript(enabled), sandbox);
  // JSON 來回一次，去掉 vm 跨 realm 的原型差異，才能用 deepEqual 比較
  const calls = JSON.parse(JSON.stringify(sandbox.dataLayer.map((args) => Array.from(args))));
  return calls.find((c) => c[0] === 'config') ?? null;
}

const cfg = (opts) => run(opts)?.[2];

// 1. 網址 from → entry_from，page_path 維持
assert.deepEqual(cfg({ search: '?from=hub_nav&x=1' }), { page_path: '/menu', entry_from: 'hub_nav' });
// 2. 網址 from 優先於新鮮的 cookie from
assert.equal(cfg({ search: '?from=hub_nav', cookie: { from: 'passport_nav', from_ts: NOW - 1000 } }).entry_from, 'hub_nav');
// 3. 無網址 from → cookie from（< 30 分鐘）；29 分鐘仍有效
assert.equal(cfg({ cookie: { from: 'passport_nav', from_ts: NOW - 1000 } }).entry_from, 'passport_nav');
assert.equal(cfg({ cookie: { from: 'passport_nav', from_ts: NOW - 29 * MIN } }).entry_from, 'passport_nav');
// 4. >= 30 分鐘、缺 from_ts、from_ts 非數字／未來 → 不帶 entry_from，其餘 config 與改動前完全一致
const base = { page_path: '/menu' };
assert.deepEqual(cfg({ cookie: { from: 'passport_nav', from_ts: NOW - 30 * MIN } }), base);
assert.deepEqual(cfg({ cookie: { from: 'passport_nav' } }), base);
assert.deepEqual(cfg({ cookie: { from: 'passport_nav', from_ts: 'x' } }), base);
assert.deepEqual(cfg({ cookie: { from: 'passport_nav', from_ts: NOW + 5000 } }), base);
// 5. 格式不符：cookie from 與網址 from 都省略；網址 from 格式不符不回退到 cookie
assert.deepEqual(cfg({ cookie: { from: 'Bad-Value!', from_ts: NOW - 1000 } }), base);
assert.deepEqual(cfg({ search: '?from=Bad-Value!', cookie: { from: 'passport_nav', from_ts: NOW - 1000 } }), base);
// 6. 無 cookie、無 from（只有 utm）
assert.deepEqual(cfg({ search: '?utm_source=ig' }), base);
assert.deepEqual(run({ search: '' })[2], base);
// 7. 超長但合法的網址 from 截成 64 字，仍符合 ^[a-z0-9_]{1,64}$
const long = cfg({ search: `?from=${'a'.repeat(80)}` }).entry_from;
assert.equal(long, 'a'.repeat(64));
assert.match(long, /^[a-z0-9_]{1,64}$/);
// 8. __SHOP_INITIAL_SEARCH__（若有）優先於 location.search
assert.equal(cfg({ search: '', initialSearch: '?from=menu_nav' }).entry_from, 'menu_nav');
// 9. 非正式網域／舊別名：不啟用不送 config；舊別名仍帶網址 from
assert.equal(run({ hostname: 'localhost', search: '?from=hub_nav' }), null);
assert.equal(run({ hostname: 'foo-abc.vercel.app', search: '?from=hub_nav' }), null);
assert.equal(run({ search: '?from=hub_nav', enabled: false }), null);
assert.equal(cfg({ hostname: 'moon-dessert-booking.vercel.app', search: '?from=hub_nav' }).entry_from, 'hub_nav');
// 10. config 之外的 bootstrap 行為不變：js 呼叫排在 config 前
{
  const sandbox = { Date, URLSearchParams, document: { cookie: '' }, location: { hostname: 'shop.kiwimu.com', pathname: '/', search: '' } };
  sandbox.window = sandbox;
  vm.runInNewContext(buildGaBootstrapScript(true), sandbox);
  assert.deepEqual(Array.from(sandbox.dataLayer, (a) => a[0]), ['js', 'config']);
  assert.equal(sandbox.__KW_GA_ENABLED, true);
}

console.log('entry_from checks passed');
