# 🚀 Dessert-Booking 部署指南 - Vercel

**日期**: 2026年3月5日  
**狀態**: 🟢 準備部署  
**GitHub**: https://github.com/Tsukishima168/moon_dessert_booking

---

## ✅ 部署前檢查清單

### 代碼狀態
- [x] 所有更改已提交到 GitHub (commit 80a1b86)
- [x] 編譯成功 (npm run build ✅)
- [x] TypeScript 無錯誤

### 待完成項目
- [ ] SQL 修復 #1: 添加 orders 表缺失列 (3 分鐘)
- [ ] SQL 修復 #2: 時區轉換修復 (2 分鐘)
- [ ] SQL #3: 菜單項目可用性表 (CREATE_MENU_AVAILABILITY.sql)

---

## 🔐 環境變數檢查

**所需環境變數** (已在 .env.local 配置):

```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

CLOUDINARY_CLOUD_NAME=dvizdsv4m
CLOUDINARY_API_KEY=525296494273748
CLOUDINARY_API_SECRET=...

RESEND_API_KEY=re_QtTqqKYd...
ADMIN_PASSWORD=admin123

LINE_LIFF_ID=2009156462-k70CqExC
GA_ID=G-3ZPV2CG7V4
```

### 部署時設定這些環境變數到 Vercel:
1. 進入 https://vercel.com/dashboard
2. 選擇 `moon_dessert_booking` 項目
3. Settings → Environment Variables
4. 添加以上所有變數值

---

## 📋 部署步驟

### 方式 1: 自動部署 (推薦)

Vercel 已連接到 GitHub repo，當推送到 `main` 分支時會自動部署。

**當前狀態**: 代碼已推送，Vercel 應該已開始部署

### 方式 2: 手動觸發部署

1. 進入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇 `moon_dessert_booking`
3. 點擊「Deployments」
4. 找最新的部署或點「Redeploy」

### 方式 3: 使用 Vercel CLI

```bash
# 安裝 Vercel CLI (如未安裝)
npm install -g vercel

# 登入
vercel login

# 部署
cd /Users/pensoair/Desktop/網路開發專案/Dessert-Booking
vercel --prod
```

---

## 🔗 部署結果

### 預期 URL
- **主網站**: https://shop.kiwimu.com
- **API**: https://shop.kiwimu.com/api/*
- **後台**: https://shop.kiwimu.com/admin

### 驗證部署成功

部署後訪問:
```bash
# 測試 Menu API
curl https://shop.kiwimu.com/api/menu

# 測試結帳頁面
https://shop.kiwimu.com/checkout

# 進入後台
https://shop.kiwimu.com/admin
```

---

## ⚠️ 重要: 執行 SQL 修復 (必須)

部署後，**立即在 Supabase 執行以下 SQL**，否則訂單功能會失敗:

### SQL #1: 添加 orders 表列 (1 分鐘)

```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS source_from VARCHAR(50),
ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100),
ADD COLUMN IF NOT EXISTS utm_content VARCHAR(100),
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_utm_source ON orders(utm_source);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
```

### SQL #2: 時區轉換修復 (2 分鐘)

```sql
DROP FUNCTION IF EXISTS check_daily_capacity(DATE, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION check_daily_capacity(
  check_date DATE,
  delivery_method_param TEXT DEFAULT 'pickup'
)
RETURNS TABLE(
  date_available DATE,
  current_count BIGINT,
  capacity_limit INTEGER,
  available BOOLEAN
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    check_date,
    COALESCE(COUNT(o.id)::BIGINT, 0),
    COALESCE(bs.max_daily_orders, 50)::INTEGER,
    CASE WHEN COALESCE(bs.max_daily_orders, 50) - COALESCE(COUNT(o.id), 0) > 0 THEN TRUE ELSE FALSE END
  FROM business_settings bs
  LEFT JOIN orders o ON 
    DATE(o.pickup_time AT TIME ZONE 'Asia/Taipei') = check_date
    AND o.delivery_method = delivery_method_param
    AND o.is_cancelled = FALSE
  GROUP BY bs.max_daily_orders;
END;
$$;
```

### SQL #3: 菜單項目可用性系統 (1 分鐘)

```sql
-- 複製完整 SQL from scripts/CREATE_MENU_AVAILABILITY.sql
```

---

## 📊 部署後檢查清單

部署完成後執行以下檢查:

### 功能檢查
- [ ] 首頁加載正常
- [ ] 菜單頁面顯示 36 項商品
- [ ] 購物車功能正常
- [ ] 結帳流程可進行到成功頁面
- [ ] 後台登入（帳密: admin / admin123）
- [ ] 圖片上傳功能
- [ ] 菜單項目可用日期設定

### API 檢查
```bash
# 測試 Menu API (應返回 36 項)
curl https://shop.kiwimu.com/api/menu

# 測試容量檢查 (SQL 修復後應返回 200)
curl 'https://shop.kiwimu.com/api/check-capacity?date=2026-03-15'

# 測試訂單提交 (SQL 修復後應返回 201)
curl -X POST https://shop.kiwimu.com/api/order \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## 🐛 常見問題

### Q: 頁面加載失敗
**A**: 檢查 Vercel 日誌 (Vercel Dashboard → Deployments → Logs)

### Q: API 返回 500 錯誤
**A**: 
1. 確認所有環境變數已設定
2. 執行 SQL 修復
3. 檢查 Supabase 連線

### Q: 圖片無法上傳
**A**:
1. 確認 Cloudinary 環境變數正確
2. 檢查 API 金鑰和密鑰

### Q: 後台登入失敗
**A**:
1. 帳號: admin
2. 密碼: admin123
3. 確認 ADMIN_PASSWORD 環境變數已設定

---

## 📞 監控與日誌

### Vercel 監控
- Dashboard: https://vercel.com/dashboard
- Logs: 點擊 Deployments 查看實時日誌
- Analytics: 查看訪客流量

### Supabase 監控
- Dashboard: https://app.supabase.com/
- Logs: 查看 SQL 執行日誌
- Database: 檢查表數據

---

## 🔄 後續步驟

### 立即 (今天)
1. ✅ 推送到 GitHub (已完成)
2. 🔄 部署到 Vercel (此步驟)
3. 🔴 執行 SQL 修復 (3 個)
4. 🔴 測試訂單流程

### 短期 (本週)
- [ ] 完整後台系統測試 (30+項)
- [ ] Discord 通知配置
- [ ] 優惠碼管理測試
- [ ] Banner 功能測試

### 中期 (下週)
- [ ] SEO 優化
- [ ] 性能監控
- [ ] 使用者反饋收集

---

## 📄 相關文檔

| 文檔 | 用途 |
|------|------|
| [SQL修復指南](docs/2026-03-05-SQL修復指南.md) | 執行 SQL 步驟 |
| [菜單可用性系統](docs/MENU_AVAILABILITY_SYSTEM.md) | 公休日期設定 |
| [後台測試清單](docs/2026-03-05-ADMIN-SYSTEM-COMPLETE-TEST.md) | 測試項目 |
| [專案狀態](CURRENT_STATUS_2026-03-05.md) | 整體進度 |

---

## ✅ 部署完成後

部署完成後，會獲得一個 Vercel 的臨時 URL。可以：

1. **複製 URL** 到瀏覽器訪問
2. **分享給客戶** 進行 UAT 測試
3. **監控分析** 以改進性能

---

**狀態**: 🟢 準備就緒  
**下一步**: 部署到 Vercel + 執行 SQL 修復
