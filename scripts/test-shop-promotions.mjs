import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const nativeRequire = createRequire(import.meta.url);
function load(file, stubs = {}, globals = {}, cache = new Map()) {
  const path = resolve(root, file); if (cache.has(path)) return cache.get(path);
  const module = { exports: {} }; cache.set(path, module.exports);
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  vm.runInNewContext(outputText, { module, exports: module.exports, URL, Date, Request, Response, Buffer,
    console: { error() {}, warn() {}, log() {} }, process: { env: {} }, ...globals,
    require: name => {
      if (Object.hasOwn(stubs, name)) return stubs[name];
      if (['crypto','node:crypto'].includes(name)) return nativeRequire(name);
      if (name.startsWith('@/') || name.startsWith('.')) {
        const target = name.startsWith('@/') ? name.slice(2) : resolve(dirname(path),name).slice(root.length + 1);
        return load(target+'.ts',stubs,globals,cache);
      }
      throw new Error(`Unexpected external dependency ${name}`);
    } }, { filename:file }); return module.exports;
}
const checks = [];
async function check(name, action) { await action(); checks.push(name); }
const config = load('src/lib/promotion-config.ts');
const valid = { code:' example ',discount_type:'percentage',discount_value:12,min_order_amount:300,max_uses:10,member_only:true,per_member_limit:1,valid_from:'2026-10-13T12:00:00Z',valid_until:'2026-10-14T12:00:00Z' };
await check('percentage uses 8.8 fold wording and 72 TWD off 600',()=>{ assert.equal(config.formatPromoDiscount('percentage',12),'8.8 折（減 12%）'); assert.equal(config.calculatePromoDiscount('percentage',12,600),72); });
await check('decimal half boundary agrees with SQL numeric rounding',()=>{assert.equal(config.calculatePromoDiscount('percentage',9.2,375),35);assert.equal(config.calculatePromoDiscount('percentage',0.01,5000),1);assert.throws(()=>config.normalizePromoConfig({...valid,discount_value:9.123}));});
await check('accepted floating-point percentage is persisted at canonical precision',()=>{assert.equal(config.normalizePromoConfig({...valid,discount_value:0.1+0.2}).discount_value,0.3);});
await check('Taipei time round-trips without browser timezone',()=>{ const input='2026-10-13T20:15'; assert.equal(config.fromTaipeiDateTimeLocal(input),'2026-10-13T12:15:00.000Z'); assert.equal(config.toTaipeiDateTimeLocal('2026-10-13T12:15:00Z'),input); });
await check('invalid calendar date is rejected at both boundaries',()=>{ assert.throws(()=>config.fromTaipeiDateTimeLocal('2026-02-31T12:00')); assert.throws(()=>config.normalizePromoConfig({...valid,valid_from:'2026-02-31T12:00:00Z'})); });
await check('date without zone and reversed activity rejected',()=>{ assert.throws(()=>config.normalizePromoConfig({...valid,valid_from:'2026-10-13T12:00'})); assert.throws(()=>config.normalizePromoConfig({...valid,valid_until:'2026-10-12T12:00:00Z'})); });
await check('negative/zero/over-100 percentage and fractional fixed rejected',()=>{ for(const value of [-1,0,101,Infinity,NaN]) assert.throws(()=>config.normalizePromoConfig({...valid,discount_value:value})); assert.throws(()=>config.normalizePromoConfig({...valid,discount_type:'fixed',discount_value:1.5})); });
await check('bad limits and guest-per-person configuration rejected',()=>{ assert.throws(()=>config.normalizePromoConfig({...valid,max_uses:0})); assert.throws(()=>config.normalizePromoConfig({...valid,per_member_limit:1.5})); assert.throws(()=>config.normalizePromoConfig({...valid,member_only:false})); });
await check('mass assignment cannot alter usage or owner fields',()=>{ const normalized=config.normalizePromoConfig({...valid,used_count:0,user_id:'spoofed',created_at:'spoofed'}); assert.equal(normalized.code,'EXAMPLE'); assert.equal(normalized.used_count,undefined); assert.equal(normalized.user_id,undefined); });
await check('banner button text/details/coupon persist in normalized payload',()=>{ const b=config.normalizeBannerConfig({title:'活動',link_text:'選購甜點',details:'第一行\n第二行',promo_code:'example',link_url:'/account?tab=offers'}); assert.equal(b.link_text,'選購甜點'); assert.equal(b.details,'第一行\n第二行'); assert.equal(b.promo_code,'EXAMPLE'); });
await check('unsafe links, URLs, colors and low contrast rejected',()=>{ for(const link_url of ['javascript:alert(1)','//evil.invalid','data:text/html,a','https://user:pass@example.invalid','/\\user:pass@evil.invalid','/\n/evil.invalid']) assert.throws(()=>config.normalizeBannerConfig({title:'activity',link_url})); assert.throws(()=>config.normalizeBannerConfig({title:'activity',image_url:'http://example.invalid/a.png'})); assert.throws(()=>config.normalizeBannerConfig({title:'activity',background_color:'#ffffff',text_color:'#ffffff'})); });
let saved;
const existing={id:'promo-id',...config.normalizePromoConfig(valid),used_count:3};
const adminService=load('src/services/promo-code.service.ts',{'@/src/repositories/promo-code.repository':{
  findPromoCodeById:async()=>existing, hasPromoHistory:async()=>true, findAllPromoCodes:async()=>[],insertPromoCode:async p=>{saved=p;return p;},updatePromoCode:async(id,p)=>{saved=p;return p;},deletePromoCode:async()=>{throw new Error('used promo must never delete');}
}});
await check('admin update preserves counter even when client sends zero',async()=>{await adminService.editPromoCode({id:'promo-id',used_count:0,description:'新的說明'});assert.equal(saved.used_count,undefined);});
await check('admin cannot reduce total limit below existing use',async()=>{await assert.rejects(adminService.editPromoCode({id:'promo-id',max_uses:2}));});
await check('used promo cannot rename or erase legacy account usage',async()=>{await assert.rejects(adminService.editPromoCode({id:'promo-id',code:'RENAMED'}));const old=existing.used_count;existing.used_count=0;await assert.rejects(adminService.editPromoCode({id:'promo-id',code:'RENAMED'}));existing.used_count=old;});
await check('used promo cannot be deleted',async()=>{await assert.rejects(adminService.removePromoCode('promo-id'));});
let bannerPayload;
const bannerService=load('src/services/banner.service.ts',{'@/src/repositories/banner.repository':{
  findBannerById:async()=>({id:'banner-id',...config.normalizeBannerConfig({title:'activity'}),view_count:20}),findAllBanners:async()=>[],
  insertBanner:async p=>{bannerPayload=p;return p;},updateBanner:async(id,p)=>{bannerPayload=p;return p;},deleteBanner:async()=>{}
}});
await check('banner edit saves custom button and ignores counter injection',async()=>{await bannerService.editBanner('banner-id',{link_text:'我的優惠',view_count:0,click_count:1000});assert.equal(bannerPayload.link_text,'我的優惠');assert.equal(bannerPayload.view_count,undefined);assert.equal(bannerPayload.click_count,undefined);});
const owner='00000000-0000-4000-8000-000000000001';
let currentUser={id:owner};let received;let rpcCalls=0;
const next={'next/server':{NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{status:options.status??200,headers:options.headers})}}};
const server={'@/lib/supabase-server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:currentUser},error:null})}})}};
const validate=load('app/api/promo-code/validate/route.ts',{...next,...server,'@/src/services/order.service':{applyPromoCode:async(...args)=>{received=args;return {valid:true,discount_amount:50,final_amount:550,message:'ok'};}}});
function req(path,body,origin='https://shop.kiwimu.com') {return new Request('https://shop.kiwimu.com'+path,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
await check('validation binds to verified session, ignoring submitted member id',async()=>{const res=await validate.POST(req('/api/promo-code/validate',{code:'example',orderAmount:600,user_id:'someone-else'}));assert.equal(res.status,200);assert.equal(received[2],owner);});
await check('cross-origin coupon validation is rejected',async()=>{assert.equal((await validate.POST(req('/api/promo-code/validate',{code:'example',orderAmount:600},'https://blog.kiwimu.com'))).status,403);});
await check('invalid subtotal never reaches discount evaluator',async()=>{received=null; assert.equal((await validate.POST(req('/api/promo-code/validate',{code:'example',orderAmount:-1}))).status,400);assert.equal(received,null);});
let listedOwner;
const offers=load('app/api/user/offers/route.ts',{...next,...server,'@/src/services/promo-checkout.service':{listMemberOffers:async user=>{listedOwner=user;return [];}}});
await check('member-offer endpoint refuses guests',async()=>{currentUser=null;assert.equal((await offers.GET()).status,401);});
await check('member-offer endpoint uses server identity and private cache',async()=>{currentUser={id:owner};const res=await offers.GET();assert.equal(res.status,200);assert.equal(listedOwner,owner);assert.ok(res.headers.get('cache-control').includes('no-store'));});
const bannerRoute=load('app/api/banners/route.ts',{...next,...server,'@/src/lib/banner-stat-key':{bannerStatRateKey:()=> 'a'.repeat(64)},'@/lib/supabase-admin':{createAdminClient:()=>({rpc:async()=>{rpcCalls++;return {data:true,error:null};}})}});
const event={bannerId:'00000000-0000-4000-8000-000000000010',impressionId:owner,action:'view'};
await check('banner event requires same origin and bounded UUID payload',async()=>{assert.equal((await bannerRoute.POST(req('/api/banners',event,'https://blog.kiwimu.com'))).status,403);assert.equal((await bannerRoute.POST(req('/api/banners',{...event,action:'delete'}))).status,400);assert.equal((await bannerRoute.POST(req('/api/banners',{...event,bannerId:'bad'}))).status,400);assert.equal(rpcCalls,0);});
await check('valid banner event reaches one protected RPC',async()=>{assert.equal((await bannerRoute.POST(req('/api/banners',event))).status,200);assert.equal(rpcCalls,1);});
const browser=load('src/lib/promotion-browser.ts',{}, {localStorage:{getItem(){throw new Error('disabled');},setItem(){throw new Error('disabled');}},navigator:{}});
await check('storage-denied announcement remains usable',()=>{assert.equal(browser.readDismissedPromotions().size,0);browser.saveDismissedPromotions(new Set(['fixture']));});
await check('copy-denied gives manual fallback instead of false success',async()=>{assert.ok((await browser.copyPromotionCode('EXAMPLE')).includes('請選取並複製 EXAMPLE'));});
await check('rate key rotates and does not trust caller proxy headers locally',()=>{
 const key=load('src/lib/banner-stat-key.ts',{}, {process:{env:{SUPABASE_SERVICE_ROLE_KEY:'offline-fixture'}}}).bannerStatRateKey;
 assert.equal(key(req('/api/banners',event),60000).length,64);
 assert.notEqual(key(req('/api/banners',event),60000),key(req('/api/banners',event),120000));
 const a=req('/api/banners',event),b=req('/api/banners',event);a.headers.set('x-forwarded-for','198.51.100.10');b.headers.set('x-forwarded-for','198.51.100.20');assert.equal(key(a,60000),key(b,60000));
});
console.log(JSON.stringify({passed:checks.length,checks,provider:'in-memory only',production_writes:0},null,2));
