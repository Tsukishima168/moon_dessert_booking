#!/usr/bin/env node
/**
 * 從網站 API 匯出品項清單（與前台／後台顯示一致）
 * 使用方式：
 *   1. 本機：先執行 npm run dev，再執行 node scripts/export-menu-to-csv.mjs
 *   2. 線上：BASE_URL=https://你的網站網址 node scripts/export-menu-to-csv.mjs
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT_PATH = join(__dirname, '..', 'docs', '品項清單_照片更新用.csv');

function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// 分類名稱 → 代碼（對照 分類對照表.csv）
const categoryToCode = {
  '蛋糕／塔類': 'cake', '蛋糕': 'cake', '塔類': 'cake', 'Cake': 'cake', 'Cake / Tart': 'cake',
  '飲品': 'drink', '飲料': 'drink', 'Drink': 'drink',
  '甜點／其他': 'dessert', '甜點': 'dessert', '其他': 'dessert', 'Dessert': 'dessert', 'Dessert / Other': 'dessert',
  '季節限定': 'seasonal', 'Seasonal': 'seasonal',
};

function toSlug(name, categoryCode) {
  if (!name || typeof name !== 'string') return '';
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fff\-]/g, '');
  return categoryCode ? `${categoryCode}-${slug}` : slug;
}

async function main() {
  console.log('正在從 API 取得資料:', BASE_URL);

  let menuData = [];
  let categoriesData = [];

  try {
    const [menuRes, catRes] = await Promise.all([
      fetch(`${BASE_URL}/api/menu`),
      fetch(`${BASE_URL}/api/categories`),
    ]);

    if (!menuRes.ok) throw new Error(`/api/menu 失敗: ${menuRes.status}`);
    if (!catRes.ok) throw new Error(`/api/categories 失敗: ${catRes.status}`);

    const menuJson = await menuRes.json();
    const catJson = await catRes.json();

    if (!menuJson.success || !menuJson.data) throw new Error('無法取得菜單資料');
    if (!catJson.success || !catJson.data) throw new Error('無法取得分類資料');

    menuData = menuJson.data;
    categoriesData = catJson.data;
  } catch (err) {
    console.error('錯誤:', err.message);
    if (BASE_URL.includes('localhost')) {
      console.log('提示：請先執行 npm run dev，或設定 BASE_URL=你的網站網址');
    }
    process.exit(1);
  }

  // 建立分類 id/name → 代碼
  const categoryCodeByKey = {};
  categoriesData.forEach((c) => {
    const name = (c.name || c.title || '').trim();
    const id = (c.id || '').toString();
    const code = categoryToCode[name] || name.replace(/\s*[\/／].*$/, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') || id;
    categoryCodeByKey[name] = code;
    categoryCodeByKey[id] = code;
  });

  const rows = [];
  const headerZh = ['序號 (No.)', 'id (ID)', '品名 (Name)', '說明 (Description)', '分類 (Category)', '分類代碼 (Category Code)', '目前圖片網址 (Current Image URL)', '是否上架 (Available)', '建議檔名 (Suggested Filename)', '更新後圖片網址 (New Image URL)'];
  rows.push(headerZh.map(escapeCsv).join(','));

  menuData.forEach((item, index) => {
    const category = (item.category || '').toString().trim();
    const categoryCode = categoryCodeByKey[category] || categoryToCode[category] || '';
    const suggestedFilename = toSlug(item.name, categoryCode) || '';

    rows.push([
      index + 1,
      item.id,
      item.name || '',
      item.description || '',
      category,
      categoryCode,
      item.image_url || '',
      item.is_available !== false ? 'true' : 'false',
      suggestedFilename,
      '',
    ].map(escapeCsv).join(','));
  });

  const csv = rows.join('\n');
  writeFileSync(OUT_PATH, '\uFEFF' + csv, 'utf8'); // BOM for Excel 正確開檔

  console.log(`已匯出 ${menuData.length} 筆品項至: docs/品項清單_照片更新用.csv`);
}

main();
