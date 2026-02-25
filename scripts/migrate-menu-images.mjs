#!/usr/bin/env node
// ============================================================
// 甜點菜單圖片遷移腳本
// 將 menu_items.image 從 Supabase Storage → Cloudinary
// ============================================================
//
// 執行前請確認 .env.local 已設定：
//   NEXT_PUBLIC_SUPABASE_URL=https://xlqwfaailjyvsycjnzkz.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=<從 Supabase Dashboard → Settings → API 取得>
//   CLOUDINARY_CLOUD_NAME=dvizdsv4m
//   CLOUDINARY_API_KEY=<從 Cloudinary Console 取得>
//   CLOUDINARY_API_SECRET=<從 Cloudinary Console 取得>
//
// 執行方式（Node.js 20+ 支援 --env-file）：
//   node --env-file=.env.local scripts/migrate-menu-images.mjs
//
// Dry-run（只列出需要遷移的圖片，不實際修改）：
//   node --env-file=.env.local scripts/migrate-menu-images.mjs --dry-run

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// ─── 環境變數驗證 ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLD_CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'dvizdsv4m';
const CLD_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLD_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const DRY_RUN = process.argv.includes('--dry-run');

const missing = [];
if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
if (!SUPABASE_SVC_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (!CLD_API_KEY) missing.push('CLOUDINARY_API_KEY');
if (!CLD_API_SECRET) missing.push('CLOUDINARY_API_SECRET');

if (missing.length > 0) {
  console.error('❌ 缺少環境變數：', missing.join(', '));
  console.error('   請確認 .env.local 已設定上述變數');
  process.exit(1);
}

// ─── Supabase（service_role 不受 RLS 限制）────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SVC_KEY, {
  auth: { persistSession: false },
});

// ─── Cloudinary 簽名上傳 ──────────────────────────────────────────────────────
// Cloudinary 簽名格式：SHA1( "param1=val1&param2=val2&...{api_secret}" )
// 不包含：file、url、api_key、resource_type、signature
function makeSignature(params) {
  const str =
    Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&') + CLD_API_SECRET;
  return createHash('sha1').update(str).digest('hex');
}

/**
 * 透過 URL 上傳圖片到 Cloudinary，回傳新的 secure_url
 * @param {string} imageUrl  原始圖片 URL（Supabase Storage 公開連結）
 * @param {string} publicId  Cloudinary 檔名（不含 folder 前綴）
 */
async function uploadToCloudinary(imageUrl, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'dessert';
  const signature = makeSignature({ folder, public_id: publicId, timestamp });

  const body = new FormData();
  body.append('file', imageUrl);
  body.append('folder', folder);
  body.append('public_id', publicId);
  body.append('timestamp', String(timestamp));
  body.append('api_key', CLD_API_KEY);
  body.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`,
    { method: 'POST', body }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Cloudinary 上傳失敗: ${JSON.stringify(json)}`);
  return json.secure_url;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('🖼️  甜點圖片遷移腳本 — Supabase Storage → Cloudinary');
  console.log('='.repeat(60));
  console.log(DRY_RUN ? '🔍 Dry-run 模式（僅列出，不修改資料庫）\n' : '🚀 執行模式\n');

  // 1. 讀取所有含 Supabase Storage URL 的圖片
  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id, name, image')
    .ilike('image', '%supabase.co/storage%')
    .order('name');

  if (error) {
    console.error('❌ 讀取 menu_items 失敗:', error.message);
    process.exit(1);
  }

  if (items.length === 0) {
    console.log('✅ 所有圖片已在外部 CDN（Cloudinary 或其他），無需遷移！');
    return;
  }

  console.log(`📋 找到 ${items.length} 張需要遷移的圖片：\n`);
  items.forEach((item, i) => {
    const shortUrl = item.image.replace('https://xlqwfaailjyvsycjnzkz.supabase.co', '[supabase]');
    console.log(`  ${String(i + 1).padStart(2)}. ${item.name}`);
    console.log(`      ${shortUrl}`);
  });
  console.log('');

  if (DRY_RUN) {
    console.log('─'.repeat(60));
    console.log('✅ Dry-run 完成。移除 --dry-run 旗幟以執行實際遷移。');
    return;
  }

  // 2. 逐一上傳並更新資料庫
  let success = 0;
  let failed = 0;

  console.log('─'.repeat(60));
  for (const item of items) {
    try {
      // 用 item.id 作為 Cloudinary public_id，確保唯一且可追蹤
      const publicId = `menu_item_${item.id}`;
      process.stdout.write(`⬆️  上傳 "${item.name}" ... `);

      const newUrl = await uploadToCloudinary(item.image, publicId);

      const { error: updateErr } = await supabase
        .from('menu_items')
        .update({ image: newUrl })
        .eq('id', item.id);

      if (updateErr) throw new Error(updateErr.message);

      console.log('✅');
      console.log(`   舊: ${item.image}`);
      console.log(`   新: ${newUrl}\n`);
      success++;
    } catch (err) {
      console.log('❌');
      console.error(`   錯誤: ${err.message}\n`);
      failed++;
    }

    // Rate limit 保護（Cloudinary free plan: 1000 requests/hour）
    await new Promise((r) => setTimeout(r, 600));
  }

  // 3. 結果摘要
  console.log('='.repeat(60));
  console.log(`📊 遷移完成：${success} 成功 / ${failed} 失敗 / ${items.length} 總計`);
  if (success > 0) {
    console.log('');
    console.log('📌 Supabase Storage 的原始圖片可以在確認 Cloudinary 正常後手動刪除');
    console.log('   Dashboard → Storage → menu-images bucket');
  }
  if (failed > 0) {
    console.log('\n⚠️  有失敗項目，請重新執行腳本（已成功的有 Cloudinary URL 不會重複上傳）');
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
