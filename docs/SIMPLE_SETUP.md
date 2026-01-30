# 🚀 超簡單設定指南

## 步驟 1：設定環境變數（2 分鐘）

複製 `.env.local.example` 為 `.env.local`：

```bash
cp .env.local.example .env.local
```

編輯 `.env.local`，填入以下資訊：

```env
# ===== 必填（否則無法運作）=====

# 1. Supabase（您已經有的）
NEXT_PUBLIC_SUPABASE_URL=https://您的專案.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0tU-VeBXI2EC4orr1TMuVA_UZr_b2RO

# 2. 匯款資訊（顯示給客戶）
BANK_NAME=連線商業銀行
BANK_CODE=824
BANK_BRANCH=總行 6880
BANK_ACCOUNT=111007479473
ACCOUNT_HOLDER=您的名字

# 3. 店家資訊
STORE_NAME=MoonMoon Dessert
STORE_PHONE=0912-345-678

# ===== 選填（之後再設定也行）=====

# Email 通知（用 Resend）
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# LINE 通知
LINE_NOTIFY_TOKEN=

# 店家 LINE ID
STORE_LINE_ID=
```

---

## 步驟 2：建立 orders 資料表（1 分鐘）

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. 左側選單 → **SQL Editor**
4. 複製 `SUPABASE_SETUP.sql` 的內容
5. 貼上並點擊 **Run**
6. 完成！

---

## 步驟 3：安裝套件（1 分鐘）

```bash
npm install
```

---

## 步驟 4：啟動！

```bash
npm run dev
```

開啟 http://localhost:3000

---

## ✅ 測試

1. 看到商品列表（從您的 Supabase menu_items 讀取）
2. 加入購物車
3. 填寫結帳表單
4. 送出訂單
5. 檢查 Supabase → Table Editor → orders 資料表

---

## 📧 之後再設定 Email + LINE（選填）

### Resend Email（5 分鐘）

1. 註冊 [resend.com](https://resend.com)
2. 取得 API Key
3. 貼到 `.env.local` 的 `RESEND_API_KEY`
4. 設定寄件人 Email：`RESEND_FROM_EMAIL=orders@yourdomain.com`
5. 重新啟動 `npm run dev`

### LINE Notify（3 分鐘）

1. 前往 [LINE Notify](https://notify-bot.line.me/my/)
2. 登入 LINE 帳號
3. 點擊「發行權杖」
4. 選擇「透過 1 對 1 聊天接收通知」
5. 複製 Token → 貼到 `.env.local` 的 `LINE_NOTIFY_TOKEN`
6. 重新啟動 `npm run dev`

---

## ❗ 常見問題

### Q1: 看不到商品？

**檢查：**
- Supabase URL 和 Key 是否正確
- `menu_items` 資料表是否有資料
- `menu_variants` 資料表是否有對應的價格

### Q2: 訂單送出失敗？

**檢查：**
- `orders` 資料表是否已建立（執行 SUPABASE_SETUP.sql）
- RLS Policy 是否已設定

### Q3: Email 或 LINE 沒收到通知？

**這是正常的！**
- 如果沒設定 `RESEND_API_KEY` 或 `LINE_NOTIFY_TOKEN`
- 系統會跳過通知，但訂單依然會建立
- 您可以之後再設定

---

## 🎉 完成！

現在您有一個完整的訂購系統了！

需要幫助？看看其他文件：
- `README.md` - 完整說明
- `PROJECT_SUMMARY.md` - 專案架構
- `SUPABASE_SETUP.sql` - 資料庫設定
