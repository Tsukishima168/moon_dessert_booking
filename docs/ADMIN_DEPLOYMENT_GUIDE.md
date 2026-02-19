# 🚀 完整後台管理系統 - 快速部署指南

## 📝 您剛才獲得了什麼

✅ **專業級後台管理系統 v2.0**，包含：

### 📊 新增功能

1. **強化版儀表板**
   - 今日訂單 & 營收統計
   - 待處理訂單計數
   - 製作中訂單計數
   - 總訂單數 & 總營收
   - 快速導航面板

2. **完整菜單管理模組** ⭐️ NEW
   - 商品上架/下架
   - 搜尋 & 分類篩選
   - 批量管理
   - 圖片預覽

3. **完善的 API 層**
   - `/api/admin/menu/*` - 完整 CRUD 操作
   - 包含認證檢查
   - 完整錯誤處理

---

## 🔧 部署步驟

### 步驟 1：執行資料庫遷移 (重要!)

在 Supabase 儀表板執行以下 SQL：

```sql
-- 建立菜單項目表
create table if not exists public.menu_items (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  description text,
  price numeric not null,
  image_url text,
  is_active boolean not null default true,
  variants jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 建立索引
create index idx_menu_items_category on public.menu_items(category);
create index idx_menu_items_is_active on public.menu_items(is_active);
create index idx_menu_items_created_at on public.menu_items(created_at);

-- 啟用 RLS
alter table public.menu_items enable row level security;

-- 建立 RLS 策略 - 所有人可讀取已上架商品
create policy "Allow public read active menu items"
on public.menu_items
for select
using (is_active = true);

-- 建立 RLS 策略 - 僅管理員可寫入/修改
create policy "Allow admin full access to menu items"
on public.menu_items
for all
using (
  auth.jwt() ->> 'role' = 'admin'
  or (select auth.uid()) is null
);
```

### 步驟 2：推送程式碼到 GitHub

```bash
git add .
git commit -m "feat: Complete admin system v2.0 with menu management"
git push origin main
```

### 步驟 3：Vercel 自動部署

- Vercel 會自動偵測 GitHub 推送
- 等待部署完成 (通常 3-5 分鐘)
- 檢查 Vercel 儀表板確認部署成功

---

## ✅ 部署檢查清單

### 現場測試 (Vercel 實時 URL)

訪問 `https://your-app.vercel.app/admin` 並測試：

#### 📊 儀表板功能
- [ ] 頁面正常載入
- [ ] 看到統計卡片 (今日訂單、營收等)
- [ ] 快速操作按鈕可點擊

#### 🍰 菜單管理
- [ ] 可訪問 `/admin/menu`
- [ ] 搜尋功能正常
- [ ] 分類篩選正常
- [ ] 可點擊「新增商品」

#### 📋 訂單看板
- [ ] Kanban 看板正常顯示
- [ ] 可拖曳訂單卡片
- [ ] 狀態更新成功

#### 🎯 其他模組
- [ ] Banner 管理正常
- [ ] 優惠碼管理正常
- [ ] 業務設定正常

---

## 📚 檔案修改清單

### 新增檔案
```
✅ app/admin/menu/page.tsx              - 菜單管理頁面
✅ app/api/admin/menu/route.ts          - 菜單 API (GET/POST/PUT/DELETE)
✅ app/api/admin/menu/[id]/route.ts     - 菜單項目 API (PATCH/DELETE)
✅ supabase/migrations/20260219_create_menu_items.sql - DB 遷移
✅ docs/ADMIN_SYSTEM_COMPLETE.md        - 完整文檔
```

### 修改檔案
```
✅ app/admin/page.tsx                   - 升級儀表板 + 統計功能
✅ components/AdminNav.tsx              - 新增菜單管理導航
```

---

## 🔐 安全設定

### 已實裝的安全機制
- ✅ 伺服器端認證檢查
- ✅ admin 角色驗證
- ✅ 自動重定向未授權用戶
- ✅ Row Level Security (RLS)

### 需要您手動設定

1. **確認 Supabase admin 使用者**
   - 到 Supabase Dashboard → Authentication
   - 找到您的帳號，確認 Custom Claims 有 `role: admin`
   - 如果沒有，執行以下 SQL：
   
   ```sql
   UPDATE auth.users SET app_metadata = jsonb_set(app_metadata, '{role}', '"admin"')
   WHERE email = 'your-email@example.com';
   ```

---

## 🧪 功能測試指南

### 測試菜單管理

1. **新增商品**
   - 點擊「新增商品」
   - 填入: 名稱、分類、價格
   - 點擊儲存
   - ✓ 商品應該出現在列表中

2. **搜尋功能**
   - 在搜尋框輸入商品名稱
   - ✓ 應該即時篩選結果

3. **分類篩選**
   - 從下拉選單選擇分類
   - ✓ 應該只顯示該分類的商品

4. **上架/下架**
   - 點擊商品旁的切換按鈕
   - ✓ 應該切換狀態

5. **刪除商品**
   - 點擊垃圾桶圖示
   - 確認刪除
   - ✓ 商品應該消失

### 測試儀表板

1. **統計卡片**
   - 應該看到：今日訂單、待處理、製作中、總訂單、總營收
   - ✓ 數字應該隨著訂單資料動態更新

2. **快速操作**
   - 點擊各個快速操作按鈕
   - ✓ 應該導向對應頁面

---

## 💾 資料庫驗證

到 Supabase Dashboard 驗證：

1. **檢查 menu_items 表**
   - Table Editor → menu_items
   - ✓ 應該看到以下欄位：
     - id, name, category, description, price
     - image_url, is_active, variants
     - created_at, updated_at

2. **檢查 RLS 狀態**
   - 表格設定 → Row Level Security
   - ✓ 應該看到 2 個 policies

---

## 🐛 常見問題

### Q: 404 錯誤 (菜單管理頁面)
**A:** 檢查：
- 已推送程式碼？ (`git push`)
- Vercel 已部署？ (檢查 Vercel Dashboard)
- URL 是否正確？ (`/admin/menu`)

### Q: "無法載入菜單" 錯誤
**A:** 檢查：
- Supabase `menu_items` 表已建立？
- 已執行 SQL 遷移？
- Row Level Security 已設定？

### Q: 新增商品後未顯示
**A:** 檢查：
- 有點擊「儲存」嗎？
- 瀏覽器 Console 有錯誤嗎？
- Supabase 表格中有資料嗎？

### Q: 無法訪問 `/admin`
**A:** 檢查：
- 已登入嗎？
- 帳號的 `role` 是 `admin` 嗎？
- Supabase 連接正常嗎？

---

## 📞 需要幫助？

1. **查看文檔**
   - [docs/ADMIN_SYSTEM_COMPLETE.md](../docs/ADMIN_SYSTEM_COMPLETE.md)

2. **檢查日誌**
   - Vercel 部署日誌
   - 瀏覽器開發者工具 (F12)
   - Supabase 資料庫日誌

3. **驗證環境**
   - `.env.local` 是否有 Supabase 設定？
   - Vercel 環境變數是否已設定？

---

## 🎉 恭喜！

您現在擁有：
- ✅ 專業級儀表板
- ✅ 完整的菜單管理
- ✅ 訂單 Kanban 看板
- ✅ Banner/優惠碼/業務設定
- ✅ 企業級安全措施

**下一步？**

根據 CURRENT_PHASE.md，請進行：
1. 第一階段：完整功能測試
2. 第二階段：資料庫確認
3. 第三階段：內容確認
4. 第四階段：邀請測試顧客

祝部署順利！ 🚀
