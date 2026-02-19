# 🎯 完整後台管理系統檢查表 (v2.0)

> 最後更新: 2026-02-19  
> 狀態: ✅ **全功能實裝完成**

---

## 📊 後台系統總覽

### 已實裝模組

| 模組 | 功能 | 狀態 | 訪問路徑 |
|------|------|------|---------|
| **儀表板** | 訂單統計、營收分析、快速操作 | ✅ | `/admin` |
| **訂單看板** | Kanban 式訂單管理、狀態拖曳、即時更新 | ✅ | `/admin` |
| **菜單管理** | 商品上架/下架、搜尋、分類篩選 | ✅ | `/admin/menu` |
| **Banner 管理** | 首頁輪播、優先級、時間控制、分析數據 | ✅ | `/admin/banners` |
| **優惠碼管理** | 建立/編輯、折扣類型、使用統計 | ✅ | `/admin/promo-codes` |
| **業務設定** | 預訂規則、產能限制、急單設定 | ✅ | `/admin/settings` |

---

## 🔌 API 端點清單

### 訂單管理
- `GET /api/admin/orders` - 取得所有訂單
- `GET /api/admin/orders?status=pending` - 按狀態篩選
- `PATCH /api/admin/orders/{orderId}` - 更新訂單狀態
- `GET /api/admin/orders/{orderId}` - 取得訂單詳細資訊

### 菜單管理 (新增)
- `GET /api/admin/menu` - 取得所有菜單項目
- `POST /api/admin/menu` - 建立新項目
- `PUT /api/admin/menu` - 更新項目
- `PATCH /api/admin/menu/{id}` - 快速更新 (上/下架)
- `DELETE /api/admin/menu?id={id}` - 刪除項目
- `DELETE /api/admin/menu/{id}` - 刪除項目 (動態路由)

### Banner 管理
- `GET /api/admin/banners` - 取得所有 Banner
- `POST /api/admin/banners` - 建立 Banner
- `PUT /api/admin/banners` - 更新 Banner
- `DELETE /api/admin/banners?id={id}` - 刪除 Banner

### 優惠碼管理
- `GET /api/admin/promo-codes` - 取得所有優惠碼
- `POST /api/admin/promo-codes` - 建立優惠碼
- `PUT /api/admin/promo-codes` - 更新優惠碼
- `DELETE /api/admin/promo-codes?id={id}` - 刪除優惠碼

### 業務設定
- `GET /api/admin/settings` - 取得所有設定
- `PUT /api/admin/settings` - 更新設定

---

## 📱 UI/UX 特色

### 儀表板 (Dashboard)
- **關鍵指標卡片**
  - 今日訂單數 + 營收
  - 待處理訂單 (待付款/已付款)
  - 製作中訂單 (製作中/可取貨)
  - 總訂單數 (歷史統計)
  - 總營收

- **快速操作面板**
  - 訂單看板
  - Banner 管理
  - 優惠碼
  - 業務設定

### 訂單看板 (Kanban Board)
- **6 欄位狀態流**
  - 待付款 → 已付款 → 製作中 → 可取貨 → 已完成
  - 已取消 (獨立欄位)

- **拖曳功能**
  - Drag & Drop 移動訂單
  - 自動更新狀態
  - 實時反應

- **快速操作**
  - 單鍵推進下一狀態
  - 顏色編碼狀態
  - 顯示訂單摘要

### 菜單管理
- **搜尋與篩選**
  - 商品名稱/描述搜尋
  - 分類篩選
  - 共 N 件商品顯示

- **商品卡片**
  - 圖片預覽
  - 分類標籤
  - 價格顯示
  - 規格數量

- **操作按鈕**
  - 上架/下架切換
  - 編輯
  - 刪除

### 優惠碼管理
- **優惠碼卡片**
  - 折扣類型顯示 (% 或 $)
  - 低消門檻
  - 使用次數
  - 啟用/停用狀態

- **編輯表單**
  - 代碼 (自動轉大寫)
  - 描述
  - 折扣類型切換
  - 最低消費
  - 啟用狀態

### Banner 管理
- **Banner 卡片**
  - 圖片預覽
  - 優先級顯示
  - 活動統計 (瀏覽/點擊)
  - 時間範圍

---

## 🛡️ 安全機制

### 認證與授權
- ✅ 伺服器端 Supabase 認證檢查
- ✅ 僅允許 `role=admin` 進入 `/admin` 區域
- ✅ 自動重定向未授權用戶

### 資料驗證
- ✅ 必填欄位檢查
- ✅ 數據類型驗證
- ✅ SQL 注入防護 (Supabase)

### 操作確認
- ✅ 刪除前提示確認
- ✅ 編輯前顯示目前值
- ✅ 成功/失敗通知

---

## 🗄️ 資料庫表格需求

### menu_items 表
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  variants JSONB, -- [{name: "6吋", price: 900}]
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### 其他表格
- orders (已存在)
- banners (已存在)
- promo_codes (已存在)
- business_settings (已存在)

---

## 🚀 部署檢查清單

### 前置準備
- [ ] Vercel 已部署 (✓ 已完成)
- [ ] Supabase 已連接 (✓ 已完成)
- [ ] 環境變數已設定 (✓ 需檢查)

### 後台功能測試
- [ ] 訂單看板能正常載入
- [ ] 能拖曳訂單更改狀態
- [ ] 菜單管理能搜尋/篩選
- [ ] 優惠碼能建立/編輯/刪除
- [ ] 業務設定能儲存

### 資料庫檢查
- [ ] `menu_items` 表已建立
- [ ] 訂單表 `orders` 包含所有必要欄位
- [ ] `promo_codes` 表正常
- [ ] `banners` 表正常

### Supabase 設定
- [ ] 後台用戶已設為 `role=admin`
- [ ] Row Level Security (RLS) 已設定
  - 訂單只能後台查看
  - 優惠碼只能後台管理
  - 菜單只能後台管理

---

## 📋 使用指南

### 訪問後台
1. 打開 `https://your-app.vercel.app/admin`
2. 使用 admin 帳號登入
3. 自動進入儀表板

### 管理訂單
1. 點擊「📋 訂單看板」
2. 拖曳訂單卡片到下一欄位
3. 或點擊「下一狀態」按鈕

### 管理菜單
1. 點擊「🍰 菜單管理」
2. 搜尋或篩選商品
3. 點擊圖示操作 (編輯/上架/刪除)

### 管理優惠碼
1. 點擊「優惠碼」
2. 點擊「新增優惠碼」
3. 填寫表單並儲存

### 業務設定
1. 點擊「業務設定」
2. 調整預訂規則或產能限制
3. 點擊「儲存」

---

## 🔧 故障排除

### 後台無法訪問
- 檢查是否登入且角色為 `admin`
- 檢查 Supabase 連接
- 檢查 URL 是否為 `/admin`

### API 錯誤 (500)
- 檢查 Supabase 表格名稱與欄位
- 檢查環境變數
- 查看瀏覽器控制台錯誤信息

### 資料未保存
- 確認網路連接
- 檢查瀏覽器主控台的錯誤
- 嘗試刷新頁面後重試

---

## 📈 未來擴展計畫

- [ ] 數據分析儀表板 (圖表/趨勢分析)
- [ ] 批量操作 (批量上架/下架)
- [ ] 庫存追蹤 (每款商品庫存)
- [ ] 客戶管理 (顧客名單/消費記錄)
- [ ] 營收報表 (日/週/月統計)
- [ ] 郵件範本管理
- [ ] 自動化規則 (訂單自動流轉)

---

## 📞 支援

如有問題，請檢查：
1. Supabase 儀表板 → 表格與資料
2. Vercel 部署日誌 → 構建/運行時錯誤
3. 瀏覽器開發者工具 → Network/Console 標籤
