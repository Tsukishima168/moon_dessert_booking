# 🚀 部署指南 - 從零開始

## Step 1: 初始化 Git Repository

```bash
# 進入專案目錄
cd /Users/penstudio/Desktop/Dessert-Booking

# 初始化 Git
git init

# 加入所有檔案
git add .

# 第一次 commit
git commit -m "feat: Add GA4 analytics and SEO optimization"
```

---

## Step 2: 建立 GitHub Repository

### 方法 A: 使用 GitHub CLI (推薦,最快)

```bash
# 安裝 gh (如果還沒安裝)
brew install gh

# 登入 GitHub
gh auth login

# 建立 repo 並推送
gh repo create Dessert-Booking --public --source=. --push
```

### 方法 B: 手動在 GitHub 網頁建立

1. 到 [github.com/new](https://github.com/new)
2. Repository name: `Dessert-Booking`
3. 選擇 Public
4. **不要** 勾選 "Initialize with README"
5. 點擊 **Create repository**
6. 複製顯示的指令:

```bash
git remote add origin https://github.com/YOUR_USERNAME/Dessert-Booking.git
git branch -M main
git push -u origin main
```

---

## Step 3: 連接 Vercel

### 3.1 登入 Vercel
1. 前往 [vercel.com](https://vercel.com)
2. 點擊 **Continue with GitHub**

### 3.2 Import Project
1. 點擊 **Add New...** → **Project**
2. 選擇剛才建立的 `Dessert-Booking` repo
3. 點擊 **Import**

### 3.3 設定環境變數 (重要!)

在 **Configure Project** 頁面,展開 **Environment Variables**:

#### 必填變數:
```
NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxx...
RESEND_API_KEY = re_xxx...
RESEND_FROM_EMAIL = orders@yourdomain.com
LINE_NOTIFY_TOKEN = xxx
BANK_NAME = 連線商業銀行
BANK_CODE = 824
BANK_BRANCH = 總行 6880
BANK_ACCOUNT = 111007479473
ACCOUNT_HOLDER = 您的名字
STORE_NAME = MoonMoon Dessert
STORE_PHONE = 0912-345-678
STORE_LINE_ID = @moonmoon
ADMIN_PASSWORD = 您的後台密碼
CRON_SECRET = (Vercel 自動生成)
```

#### GA4 變數 (選填,沒有也能部署):
```
NEXT_PUBLIC_GA4_ID = G-XXXXXXXXXX
```
> 💡 取得 GA4 ID: [Google Analytics](https://analytics.google.com) → 管理 → 資料串流

### 3.4 部署!
1. 確認所有變數都填好
2. 點擊 **Deploy**
3. 等待 1-2 分鐘... ☕

---

## Step 4: 取得 Vercel 網址

部署完成後,Vercel 會給您:
- **Production URL**: `https://dessert-booking-xxx.vercel.app`
- 或自訂網域 (如果您有的話)

**複製這個網址!** 接下來要用到。

---

## Step 5: 更新網站網址 (重要!)

用您的實際 Vercel 網址替換以下 3 個檔案:

### 5.1 更新 layout.tsx
**檔案**: `app/layout.tsx` (第 16 行)

```tsx
url: 'https://YOUR-ACTUAL-URL.vercel.app',  // ⬅️ 改這裡
```

### 5.2 更新 robots.ts
**檔案**: `app/robots.ts` (第 4 行)

```tsx
const baseUrl = 'https://YOUR-ACTUAL-URL.vercel.app';  // ⬅️ 改這裡
```

### 5.3 更新 sitemap.ts
**檔案**: `app/sitemap.ts` (第 4 行)

```tsx
const baseUrl = 'https://YOUR-ACTUAL-URL.vercel.app';  // ⬅️ 改這裡
```

### 5.4 推送更新
```bash
git add .
git commit -m "chore: Update production URLs"
git push
```

Vercel 會自動重新部署! 🎉

---

## Step 6: 設定 GA4 (選用)

如果您需要 GA4 追蹤:

1. 到 [Google Analytics](https://analytics.google.com)
2. 建立新資源 → 資料串流
3. 複製 **Measurement ID** (G-XXXXXXXXXX)
4. 回到 Vercel → Settings → Environment Variables
5. 新增:
   - Name: `NEXT_PUBLIC_GA4_ID`
   - Value: `G-XXXXXXXXXX`
6. 點擊 **Redeploy** → **Use existing Build Cache**

---

## Step 7: 驗證部署

### 7.1 測試網站
開啟您的 Vercel 網址,確認:
- ✅ 首頁正常顯示
- ✅ 購物車功能正常
- ✅ 結帳流程可以走完

### 7.2 測試 SEO
在瀏覽器輸入:
```
https://YOUR-URL.vercel.app/robots.txt
https://YOUR-URL.vercel.app/sitemap.xml
```

應該都能正常顯示!

### 7.3 測試社群分享
在 LINE 或 Facebook 貼上您的網址,應該會顯示:
- ✅ 月島甜點 Logo
- ✅ 網站描述
- ✅ 漂亮的預覽卡片

---

## 🎉 完成!

您的網站現已上線,具備:
- ✅ GA4 追蹤 (如果有設定)
- ✅ SEO 優化
- ✅ 社群媒體分享預覽
- ✅ 自動 sitemap

### 下一步建議

1. **提交 Sitemap 到 Google**:
   - [Google Search Console](https://search.google.com/search-console)
   - 新增資源 → 提交 sitemap

2. **測試 GA4**:
   - 訪問網站
   - 到 GA4 → 即時報表
   - 看到自己的訪問!

3. **監控數據**:
   - 每週檢查 GA4 流量
   - 觀察 Search Console 索引狀態

---

## 遇到問題?

### 常見錯誤

**Q: 部署失敗 "Failed to compile"**
A: 確認環境變數都設定了,特別是 `NEXT_PUBLIC_SUPABASE_URL`

**Q: GA4 沒有數據**
A: 開發環境不會追蹤,只有 production 會追蹤

**Q: Open Graph 預覽沒顯示**
A: 社群平台需要時間更新快取,可以用 [Facebook Debugger](https://developers.facebook.com/tools/debug/) 強制更新

---

需要協助嗎?參考 [walkthrough.md](file:///Users/penstudio/.gemini/antigravity/brain/2affbcbd-1d23-4dd4-abca-613ca7a85c81/walkthrough.md) 的詳細驗證步驟!
