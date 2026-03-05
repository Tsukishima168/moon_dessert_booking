---
tags: [bug-fix, 2026-03, admin, checkout]
date: 2026-03-05
status: in-progress
---

# 2026-03-05 後台登入 & 結帳頁面問題診斷

## 🚨 問題清單

### 問題 1: 後台無法登入
**症狀**: 管理員無法進入後台系統
**狀態**: 🔴 未解決
**優先級**: 🔴 關鍵

### 問題 2: 前端無法進入結帳頁面
**症狀**: 用戶點擊結帳時頁面無法加載或被重定向
**狀態**: 🔴 未解決
**優先級**: 🔴 關鍵

---

## 🔍 診斷過程

### 後台登入問題診斷

#### 技術架構
```
前端登入頁面
    ↓
/api/admin/auth (密碼驗證)
    ↓
生成 Session Token
    ↓
localStorage + Cookies 存儲
    ↓
後台管理員頁面 (/admin)
```

#### 代碼位置
- **認證 API**: `app/api/admin/auth/route.ts`
- **登入頁面**: `app/auth/login/page.tsx`
- **後台首頁**: `app/admin/page.tsx`

#### 可能原因分析
1. **環境變數問題**
   - [ ] ADMIN_PASSWORD 未設置或為空
   - [ ] .env.local 未配置

2. **Session 存儲問題**
   - [ ] localStorage 被禁用
   - [ ] Cookies 未正確設置
   - [ ] 跨域 Cookie 策略 (SameSite 限制)

3. **認證流程問題**
   - [ ] 密碼哈希計算錯誤
   - [ ] 速率限制被觸發 (連續失敗)
   - [ ] 瀏覽器緩存導致舊代碼執行

4. **授權檢查問題**
   - [ ] 後台頁面缺少認證檢查
   - [ ] 角色檢查邏輯有誤
   - [ ] 重定向條件不正確

#### 相關代碼片段
```typescript
// api/admin/auth/route.ts - 認證驗證
function secureCompare(input: string, expected: string): boolean {
    const inputHash = createHash('sha256').update(input).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(inputHash, expectedHash);
}

if (secureCompare(password, adminPassword)) {
    clearAuthFailures(clientId);
    return NextResponse.json({ success: true });
}
```

---

### 結帳頁面問題診斷

#### 技術架構
```
前端購物車頁面
    ↓
點擊結帳按鈕
    ↓
檢查購物車是否為空
    ↓
加載結帳頁面 (/checkout)
    ↓
初始化表單 & Auth 狀態
    ↓
顯示結帳表單
```

#### 代碼位置
- **結帳頁面**: `app/checkout/page.tsx`
- **認證邏輯**: 第 86-130 行 (useEffect)
- **表單提交**: 第 248 行 (onSubmit)

#### 可能原因分析
1. **購物車問題**
   - [ ] 購物車為空時未提示
   - [ ] Zustand store 狀態未初始化
   - [ ] 購物車數據丟失

2. **Auth 狀態問題**
   - [ ] Supabase session 未正確初始化
   - [ ] Auth 狀態變更監聽失敗
   - [ ] LINE LIFF 初始化阻塞

3. **頁面加載問題**
   - [ ] 依賴項加載超時
   - [ ] API 請求 (`/api/admin/settings`) 失敗
   - [ ] 環境變數缺失

4. **表單渲染問題**
   - [ ] React Hook Form 初始化失敗
   - [ ] 條件渲染邏輯錯誤
   - [ ] 日期選擇器無法加載

#### 相關代碼片段
```typescript
// 購物車檢查
if (!Array.isArray(items) || items.length === 0) {
  return NextResponse.json(
    {
      success: false,
      message: '購物車是空的',
    },
    { status: 400 }
  );
}

// Auth 狀態初始化
useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setLoggedInUser({
          email: session.user.email || '',
          id: session.user.id
        });
        setValue('email', session.user.email || '');
      }
    });
    // ...
}, [setValue]);
```

---

## 🔧 初步排查步驟

### 檢查清單
- [ ] 驗證 .env.local 中的 ADMIN_PASSWORD 已設置
- [ ] 檢查瀏覽器控制台是否有 JavaScript 錯誤
- [ ] 檢查 Network 標籤中 API 請求的響應
- [ ] 清除瀏覽器緩存重新訪問
- [ ] 嘗試無痕/隱私模式訪問
- [ ] 檢查 Supabase 連接状態

### 後台登入排查
```bash
# 1. 檢查環境變數
grep ADMIN_PASSWORD /Users/pensoair/Desktop/網路開發專案/Dessert-Booking/.env.local

# 2. 檢查登入密碼是否正確
# 預設密碼應該在 .env.local 中

# 3. 檢查速率限制是否被觸發
# 連續失敗 5 次會被鎖定 15 分鐘
```

### 結帳頁面排查
```bash
# 1. 檢查購物車是否有商品
# 打開開發者工具 → Console → 執行: localStorage.getItem('cart-store')

# 2. 檢查 Supabase 連接
# Console → fetch('/api/check-capacity')

# 3. 檢查環境變數
grep NEXT_PUBLIC /Users/pensoair/Desktop/網路開發專案/Dessert-Booking/.env.local
```

---

## 📝 下一步修復計畫

### 優先修復
1. **後台登入問題** (立即修復)
   - [ ] 驗證環境變數配置
   - [ ] 檢查 Session 存儲機制
   - [ ] 檢查認證流程日誌
   - [ ] 測試登入功能

2. **結帳頁面問題** (緊急修復)
   - [ ] 驗證購物車狀態
   - [ ] 檢查 Auth 初始化
   - [ ] 檢查 API 響應
   - [ ] 測試完整流程

### 修復方案資源
- 後台認證流程文檔: `app/api/admin/auth/route.ts`
- 結帳流程文檔: `app/checkout/page.tsx`
- 環境變數示例: `.env.local.example`

---

## 🔗 相關檔案

- [Dessert-Booking 後台系統](../Dessert-Booking/)
- [ADMIN_SYSTEM_DELIVERY.md](../Dessert-Booking/ADMIN_SYSTEM_DELIVERY.md)
- [ORDER_FLOW_GUIDE.md](../Dessert-Booking/docs/ORDER_FLOW_GUIDE.md)

---

## ✍️ 簽名

**作者**: Penso Air  
**日期**: 2026-03-05  
**狀態**: 🔴 待修復  
**優先級**: 🔴 關鍵

#bug-fix #2026-03 #admin-system #checkout #dessert-booking
