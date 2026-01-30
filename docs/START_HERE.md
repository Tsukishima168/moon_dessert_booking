# 🎯 從這裡開始！

## ⚡ 超快速啟動（5 分鐘）

### 1️⃣ 更新 Supabase URL（30 秒）

編輯 `.env.local`，將第一行改成您的 Supabase URL：

```env
NEXT_PUBLIC_SUPABASE_URL=https://您的專案ID.supabase.co
```

**如何取得 URL？**
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案
3. Settings → API
4. 複製 **Project URL**

---

### 2️⃣ 建立訂單資料表（1 分鐘）

1. Supabase Dashboard → **SQL Editor**
2. 開啟專案中的 `scripts/SUPABASE_SETUP.sql`
3. 複製全部內容
4. 貼到 SQL Editor
5. 點擊 **Run**

完成！訂單資料表已建立。

---

### 3️⃣ 安裝 + 啟動（2 分鐘）

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

---

## ✅ 測試

1. **看到商品了嗎？**
   - 是 → 成功！繼續下一步
   - 否 → 檢查 Supabase URL 是否正確

2. **加入購物車**
   - 點擊商品的「加入購物車」按鈕
   - 右上角購物車圖示應該顯示數量

3. **測試訂單**
   - 點擊「前往結帳」
   - 填寫表單（隨便測試即可）
   - 送出訂單
   - 前往 Supabase → Table Editor → orders
   - 應該看到新訂單！

---

## 📧 之後再設定 Email + LINE（選填）

現在先不管，系統已經能用了！

等您想要通知功能時，看 [SIMPLE_SETUP.md](./SIMPLE_SETUP.md) 的「選填」部分。

---

## ❗ 遇到問題？

### Q: 看不到商品？

**檢查：**
1. `.env.local` 的 Supabase URL 是否正確
2. 您的 `menu_items` 資料表是否有資料
3. 您的 `menu_variants` 資料表是否有價格

**測試 Supabase 連線：**
```bash
# 在瀏覽器按 F12 → Console
# 應該看到「成功讀取 X 個菜單項目」
```

---

### Q: 訂單送不出去？

**檢查：**
1. 是否執行了 `SUPABASE_SETUP.sql`
2. `orders` 資料表是否存在

**驗證方法：**
- Supabase → Table Editor → 應該看到 `orders` 資料表

---

### Q: Email 或 LINE 沒收到？

**這是正常的！**
- 如果沒設定 API Key，系統會跳過通知
- 但訂單依然會建立成功
- 您可以之後再設定

---

## 🎉 完成！

您現在有一個能用的訂購系統了！

**接下來：**
- ✅ 測試下單流程
- ✅ 在 Supabase 查看訂單
- ✅ 之後再設定 Email / LINE 通知
- ✅ 改成您自己的品牌名稱和顏色

需要更多幫助？看 [README.md](../README.md)
