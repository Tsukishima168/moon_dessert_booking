---
tags: [admin-system, testing, backend, cloudinary]
date: 2026-03-05
status: in-progress
---

# 🎛️ 後台管理系統 - 完整功能測試 & 改進計劃

## 📋 後台功能清單

### ✅ 已實現的功能

#### 1. 菜單管理 (`/admin/menu`)
- [x] 顯示所有商品
- [x] 搜尋商品
- [x] 按分類篩選
- [x] 新增商品
- [x] 編輯商品
- [x] 刪除商品
- [x] 圖片預覽
- [ ] **圖片直接上傳** ⭐ (需補齊)
- [x] 價格管理
- [x] 變體管理
- [x] 上架/下架切換

#### 2. 訂單管理 (`/admin`)
- [x] 顯示所有訂單
- [x] 按狀態篩選
- [x] 訂單拖拖排序（Drag & Drop）
- [x] 更新訂單狀態
- [x] 顯示訂單詳情
- [x] 收入統計
- [x] 訂單統計

#### 3. 優惠碼管理 (`/admin/promo-codes`)
- [x] 建立優惠碼
- [x] 編輯優惠碼
- [x] 刪除優惠碼
- [x] 有效期管理
- [x] 使用限制

#### 4. Banner 管理 (`/admin/banners`)
- [x] 顯示 Banner 列表
- [x] 建立 Banner
- [x] 編輯 Banner
- [x] 刪除 Banner
- [ ] **圖片直接上傳** ⭐ (需補齊)

#### 5. 行銷活動 (`/admin/campaigns`)
- [x] 建立行銷活動
- [x] 編輯活動設定
- [x] 自動化規則管理

#### 6. 設定管理 (`/admin/settings`)
- [x] 營業時間設定
- [x] 日期限制設定
- [x] 產能上限設定

#### 7. 其他功能
- [x] Discord 設定與測試
- [x] Email 範本管理
- [x] 推送通知範本
- [x] 客戶分析

---

## 🔧 需補齊的功能

### 優先級 1️⃣ - 圖片直接上傳功能

#### 問題現狀
- 菜單和 Banner 的圖片需要手動輸入 URL
- Cloudinary API 已配置且上傳 API 已實現
- **缺少前端上傳按鈕**

#### 改進方案
為菜單和 Banner 添加圖片上傳按鈕，直接上傳至 Cloudinary

**步驟 1: 更新菜單頁面** (`app/admin/menu/page.tsx`)
```tsx
// 添加圖片上傳按鈕
const handleImageUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'moon-dessert/menu');
  
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  if (data.success) {
    setForm(f => ({ ...f, image_url: data.url }));
  }
};
```

**步驟 2: 添加 HTML 上傳元件**
```tsx
<div className="flex gap-2 items-center">
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      if (e.target.files?.[0]) {
        handleImageUpload(e.target.files[0]);
      }
    }}
    className="hidden"
    id="image-upload"
  />
  <label 
    htmlFor="image-upload"
    className="px-3 py-2 bg-moon-accent text-moon-black text-sm cursor-pointer hover:opacity-90"
  >
    上傳圖片
  </label>
  
  <input
    type="text"
    value={form.image_url}
    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
    placeholder="https://res.cloudinary.com/..."
    className="flex-1 px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm"
  />
</div>
```

---

## 🧪 完整的後台功能測試計劃

### Phase 1: 基礎功能測試 (1 小時)

#### 1.1 菜單管理測試
```
[ ] 訪問 /admin/menu
[ ] 驗證菜單列表載入
[ ] 測試搜尋功能
[ ] 測試分類篩選
[ ] 新增商品 (含圖片)
[ ] 編輯商品
[ ] 刪除商品
[ ] 驗證圖片預覽
[ ] 驗證變體管理
[ ] 驗證上架/下架切換
```

**測試商品資料**:
```json
{
  "name": "測試商品",
  "category": "tiramisu",
  "description": "這是測試商品",
  "price": 1000,
  "image_url": "(從 Cloudinary 上傳)",
  "is_active": true,
  "variants": [
    { "variant_name": "小份", "price": 500 },
    { "variant_name": "大份", "price": 1000 }
  ]
}
```

#### 1.2 訂單管理測試
```
[ ] 訪問 /admin (訂單首頁)
[ ] 驗證訂單列表載入
[ ] 測試按狀態篩選
[ ] 驗證拖拖排序功能
[ ] 更新訂單狀態
  [ ] pending → paid
  [ ] paid → preparing
  [ ] preparing → ready
  [ ] ready → completed
[ ] 驗證收入統計計算
[ ] 驗證訂單詳情顯示
```

#### 1.3 優惠碼管理測試
```
[ ] 訪問 /admin/promo-codes
[ ] 新增優惠碼
  [ ] 百分比折扣
  [ ] 固定金額折扣
[ ] 設定有效期
[ ] 設定使用限制
[ ] 編輯優惠碼
[ ] 刪除優惠碼
[ ] 驗證前端可使用優惠碼
```

**測試優惠碼**:
```json
{
  "code": "TEST10",
  "discount_type": "percentage",
  "discount_value": 10,
  "min_order_amount": 500,
  "max_uses": 100,
  "valid_until": "2026-12-31"
}
```

---

### Phase 2: 進階功能測試 (1 小時)

#### 2.1 Banner 管理測試
```
[ ] 訪問 /admin/banners
[ ] 新增 Banner
  [ ] 上傳圖片
  [ ] 設定標題和描述
  [ ] 設定優先度
  [ ] 設定有效期
[ ] 編輯 Banner
[ ] 刪除 Banner
[ ] 驗證 Banner 在首頁顯示
[ ] 驗證 Banner 統計 (點擊數/瀏覽數)
```

#### 2.2 行銷自動化測試
```
[ ] 訪問 /admin/campaigns
[ ] 新增行銷活動
[ ] 設定觸發條件
[ ] 設定動作
[ ] 編輯活動
[ ] 刪除活動
[ ] 驗證自動化執行
```

#### 2.3 設定管理測試
```
[ ] 訪問 /admin/settings
[ ] 修改營業時間
[ ] 修改日期限制 (最早/最晚預訂天數)
[ ] 修改產能上限
[ ] 驗證設定立即生效
```

#### 2.4 整合功能測試
```
[ ] 新訂單通知 (Discord/Email)
[ ] 優惠碼驗證
[ ] 庫存計算
[ ] 統計數據準確性
```

---

### Phase 3: 圖片上傳功能測試 (30 分鐘) ⭐

#### 3.1 菜單圖片上傳
```
[ ] 點擊「上傳圖片」按鈕
[ ] 選擇圖片檔案 (JPG/PNG/WEBP)
[ ] 驗證上傳進度
[ ] 驗證 Cloudinary URL 返回
[ ] 驗證圖片預覽更新
[ ] 驗證可編輯和刪除已上傳圖片
[ ] 驗證圖片大小限制 (5MB)
[ ] 驗證圖片類型限制
```

#### 3.2 Banner 圖片上傳
```
[ ] 點擊「上傳圖片」按鈕
[ ] 上傳 Banner 圖片
[ ] 驗證尺寸建議 (1920x500 px)
[ ] 驗證圖片在首頁正確顯示
```

---

## 🔌 Cloudinary 配置驗證

### 環境變數檢查
```bash
✅ CLOUDINARY_CLOUD_NAME=<redacted>
✅ CLOUDINARY_API_KEY=<redacted>
✅ CLOUDINARY_API_SECRET=<redacted>
```

### 上傳 API 端點
- **位置**: `/api/admin/upload`
- **方法**: POST
- **認證**: 需要管理員權限
- **Request**: `FormData { file: File, folder?: string }`
- **Response**: `{ success: boolean, url: string, public_id: string }`

### 已上傳圖片位置
- **菜單圖片**: `https://res.cloudinary.com/dvizdsv4m/image/upload/...`
- **Folder**: `moon-dessert/menu`

---

## ✅ 實施步驟

### Step 1: 補齊圖片上傳功能 (15 分鐘)

修改 `app/admin/menu/page.tsx`:
- 添加 `handleImageUpload()` 函數
- 添加 `<input type="file">` 元件
- 添加上傳按鈕
- 添加上傳進度提示
- 添加錯誤處理

修改 `app/admin/banners/page.tsx`:
- 同樣添加圖片上傳功能

### Step 2: 完整功能測試 (2 小時)

按照上述測試計劃執行

### Step 3: 修復發現的問題 (1 小時)

根據測試結果修復任何 bug

---

## 📊 測試檢查清單

### 功能完整性檢查
- [ ] 所有 CRUD 操作正常
- [ ] 所有驗證規則生效
- [ ] 所有錯誤提示清晰
- [ ] 所有數據正確儲存

### 性能檢查
- [ ] 菜單列表加載 < 2 秒
- [ ] 圖片上傳 < 10 秒
- [ ] 搜尋/篩選 < 1 秒

### 安全檢查
- [ ] 後台認證正常
- [ ] 非管理員無法訪問
- [ ] 圖片上傳有大小限制
- [ ] 圖片上傳有類型限制

### 用戶體驗檢查
- [ ] 表單填寫直觀
- [ ] 反饋提示清晰
- [ ] 錯誤恢復簡單
- [ ] 流程高效率

---

## 🎯 優先修復順序

1. **圖片直接上傳** ⭐ (最重要)
   - 時間: 15 分鐘
   - 影響: 大幅提升運營效率

2. **完整功能測試**
   - 時間: 2 小時
   - 影響: 發現並修復所有 bug

3. **性能優化** (可選)
   - 時間: 1 小時
   - 影響: 提升用戶體驗

---

**開始時間**: 2026-03-05 12:00
**預計完成**: 2026-03-05 15:30
**狀態**: 🟡 待開始

#admin-system #testing #cloudinary #backend #image-upload
