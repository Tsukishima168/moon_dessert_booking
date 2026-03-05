# 📸 圖片上傳功能 - 實現完成文檔

> 實現日期: 2026-03-05  
> 狀態: ✅ 完成  
> 受影響的文件: `/app/admin/menu/page.tsx`

---

## 功能概述

添加了直接的圖片上傳功能到菜單管理頁面，取代了之前的手動 URL 複製。

### 工作流程

1. 點擊「上傳圖片」按鈕
2. 選擇本地 JPG/PNG 圖片
3. 自動上傳到 Cloudinary
4. 圖片 URL 自動填入表單
5. 提交菜單項目時同時保存圖片

---

## 實現細節

### 新增 Hook
```typescript
import { useRef } from 'react';
```

### 新增 State & Ref
```typescript
const [uploadingImage, setUploadingImage] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
```

### 新增 Function
```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 驗證文件類型
    if (!file.type.startsWith('image/')) {
        alert('請選擇圖片檔案');
        return;
    }
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'moon-dessert/menu');
    
    try {
        const response = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formData,
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '上傳失敗');
        }
        
        const data = await response.json();
        setForm({ ...form, image_url: data.url });
        alert('圖片上傳成功');
    } catch (error) {
        console.error('圖片上傳錯誤:', error);
        alert(`上傳失敗: ${error instanceof Error ? error.message : '請重試'}`);
    } finally {
        setUploadingImage(false);
    }
};
```

### 新增 UI 組件
```tsx
<div>
    <label className="block text-xs text-moon-muted tracking-wider mb-2">
        圖片（Cloudinary）
    </label>
    <div className="flex gap-2">
        <input
            type="text"
            value={form.image_url}
            onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
            placeholder="https://res.cloudinary.com/..."
            className="flex-1 px-3 py-2 bg-moon-black border border-moon-border text-moon-text text-sm focus:outline-none focus:border-moon-accent"
        />
        <div className="relative">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="px-3 py-2 bg-moon-accent text-moon-black font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
                {uploadingImage ? '上傳中...' : '上傳圖片'}
            </button>
        </div>
    </div>
    {form.image_url && (
        <div className="mt-2 w-20 h-20 border border-moon-border overflow-hidden">
            <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
        </div>
    )}
</div>
```

---

## 技術架構

### 前端
- **位置**: `/app/admin/menu/page.tsx` 第 113-145 行 (handleImageUpload 函數)
- **位置**: `/app/admin/menu/page.tsx` 第 451-483 行 (上傳 UI)
- **狀態管理**: React useState + useRef
- **錯誤處理**: Try-catch + 用戶友善的警告訊息
- **樣式**: Tailwind CSS (moon 主題)

### 後端
- **端點**: `/api/admin/upload` (已存在)
- **認證**: `ensureAdmin()` 中間件
- **上傳服務**: Cloudinary API
- **簽名**: SHA-1 HMAC (安全)
- **限制**: 5MB 文件大小、image/* 類型
- **文件夾**: `moon-dessert/menu`

### 流程
```
用戶選擇圖片
    ↓
前端驗證類型 (image/*)
    ↓
FormData 編碼
    ↓
POST /api/admin/upload
    ↓
後端驗證權限 (ensureAdmin)
    ↓
生成 Cloudinary 簽名
    ↓
上傳至 Cloudinary
    ↓
返回圖片 URL
    ↓
前端自動填入 form.image_url
    ↓
用戶提交菜單時一起保存
```

---

## 使用步驟

1. 進入 `/admin/menu` 菜單管理頁面
2. 點擊「新增菜單」或編輯現有菜單
3. 找到「圖片（Cloudinary）」區段
4. 點擊「上傳圖片」按鈕（或手動貼上 URL）
5. 選擇本地圖片文件
6. 等待上傳完成（按鈕顯示「上傳中...」）
7. 圖片 URL 自動填入，顯示縮圖預覽
8. 點擊「保存」提交菜單項目

---

## 依賴關係

### 環境變數 (`.env.local`)
```
CLOUDINARY_CLOUD_NAME=dvizdsv4m
CLOUDINARY_API_KEY=525296494273748
CLOUDINARY_API_SECRET=<secret>
```

### API 依賴
- `/api/admin/upload` - 必須存在且正常運作

### 權限
- 調用者必須通過 `ensureAdmin()` 認證
- 密碼: `admin123` (`.env.local`)

---

## 測試清單

- [ ] 成功上傳 JPG 圖片
- [ ] 成功上傳 PNG 圖片
- [ ] 拒絕非圖片文件 (如 PDF)
- [ ] 顯示「上傳中...」狀態
- [ ] 上傳成功後自動填入 URL
- [ ] 顯示圖片縮圖預覽
- [ ] 上傳失敗時顯示錯誤訊息
- [ ] 仍可手動貼上 URL
- [ ] 菜單提交時圖片 URL 被保存
- [ ] 編輯菜單時現有圖片顯示

---

## 已知限制

| 限制 | 說明 |
|------|------|
| 文件大小 | 限制 5MB (由 `/api/admin/upload` 定義) |
| 文件類型 | 僅接受 `image/*` MIME 類型 |
| 文件夾 | 固定為 `moon-dessert/menu` |
| 簽名方式 | SHA-1 (Cloudinary 標準) |

---

## 擴展建議

如需為 Banner 也添加圖片上傳，可參考本功能的實現方式複製到 `/app/admin/banners/page.tsx`。

```typescript
// 複製 handleImageUpload 函數
// 改變 folder 參數為 'moon-dessert/banners'
// 調整 formData 字段名稱（如果 Banner 表有不同的圖片列名）
```

---

## 故障排除

| 問題 | 原因 | 解決方案 |
|------|------|--------|
| 上傳按鈕未顯示 | 瀏覽器快取 | 清除快取或重載頁面 |
| 上傳失敗 "401" | 管理員認證失敗 | 確認密碼正確登入 |
| 上傳失敗 "403" | 權限不足 | 重新登入管理員帳號 |
| 圖片 URL 為空 | API 返回錯誤 | 檢查 Cloudinary 憑證 |
| 預覽不顯示 | URL 無效 | 驗證 Cloudinary URL 格式 |

---

## 下一步

- [ ] 為 Banner 實現相同功能
- [ ] 添加拖放上傳支持 (drag-drop)
- [ ] 實現批量上傳
- [ ] 添加圖片裁剪功能
- [ ] 集成圖片最佳化 (WebP 轉換等)

