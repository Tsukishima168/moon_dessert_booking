# Discord 訂單通知整合

**功能**: 每當客戶提交訂單時，自動發送 Discord 通知到店家頻道

**日期**: 2026年3月5日  
**狀態**: ✅ 已整合

---

## 🎯 功能說明

### 訂單來源標記
所有透過 shop.kiwimu.com 提交的訂單會自動標記為 **`source_from: 'shop'`**

### Discord 通知內容

當有新訂單時，Discord 會收到格式化的通知，包含：

```
標題: 🔔 新訂單通知 (New Order)
描述: 訂單編號 + 來源（Shop 門市）

欄位：
- 👤 客戶資訊 (姓名、電話)
- 💰 訂單金額 (總額、折扣)
- 🚚 配送資訊 (地址、備註) 或 🏪 自取資訊
- 📅 取貨時間
- 訂購商品列表

顏色: Moon Accent (#d4a574)
```

### 範例通知

```
🔔 新訂單通知 (New Order)
訂單編號: ORD1772695561724
來源：Shop 門市 🛒

👤 客戶資訊
張三
0912345678

💰 訂單金額
NT$1,500 (已折抵 NT$100)

🚚 配送資訊
台北市安南區○○街○號
備註：請按門鈴

📅 時間
2026-03-08 14:00:00

訂購商品
• 黑森林蛋糕 x1
• 提拉米蘇 x2
```

---

## ⚙️ 設定步驟

### Step 1: 取得 Discord Webhook URL

1. 進入 Discord 伺服器（店家頻道）
2. 右鍵點擊頻道 → 編輯頻道
3. 左側選單 → 整合
4. 建立 Webhook
5. 複製 Webhook URL

範例格式:
```
https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
```

### Step 2: 設定環境變數

#### 本地開發 (.env.local)
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

#### Vercel 部署
1. 進入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇 `moon_dessert_booking` 項目
3. Settings → Environment Variables
4. 添加變數:
   - **名稱**: DISCORD_WEBHOOK_URL
   - **值**: (貼上上方的 Webhook URL)
5. 點擊「Save」

### Step 3: 部署並測試

推送代碼到 GitHub：
```bash
git add .
git commit -m "feat: 添加 Discord 訂單通知"
git push origin main
```

Vercel 會自動部署。部署完成後，進行測試：

```bash
# 測試訂單提交
curl -X POST https://moon-dessert-booking.vercel.app/api/order \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "測試客戶",
    "phone": "0912345678",
    "email": "test@example.com",
    "pickup_time": "2026-03-08 14:00",
    "items": [{"menu_item_id": "1", "quantity": 1}],
    "total_price": 100,
    "delivery_method": "pickup"
  }'
```

若 Discord 頻道收到通知 ✅，表示整合成功！

---

## 📊 訂單來源標記

所有訂單都會紀錄來源：

| 來源 | 標記 | 顯示在 Discord |
|------|------|-------|
| Shop 門市網站 | `shop` | Shop 門市 🛒 |
| 月島地圖 | `map` | 月島地圖 🗺️ |
| 甜點護照 | `passport` | 甜點護照 🎫 |
| 扭蛋 | `gacha` | 扭蛋 🎰 |

在結帳 API 中自動設定：
```typescript
source_from: source_from || 'shop' // 預設值為 'shop'
```

---

## 🔔 自動通知流程

```
客戶提交訂單
    ↓
/api/order 收到請求
    ↓
驗證欄位 + 建立訂單
    ↓
並行發送通知:
├─ 📧 客戶郵件 (sendCustomerEmail)
├─ 📱 LINE/Discord 店家通知 (notifyNewOrder)
│   └─ Discord Embed 格式化通知
├─ 📊 同步到 n8n (Google Sheet)
└─ ✅ 返回訂單編號
```

---

## 🐛 除錯

### 問題 1: Discord 沒收到通知

**檢查清單**:
- [ ] Webhook URL 設定在環境變數
- [ ] Webhook URL 有效且未過期
- [ ] Bot 有「發送訊息」權限
- [ ] 頻道不是私人/隱藏
- [ ] 檢查 Vercel 日誌

**檢查日誌方式**:
1. Vercel Dashboard → Deployments → 最新部署
2. 點擊「Logs」標籤
3. 搜尋 "Discord" 關鍵字

### 問題 2: 通知延遲

Discord 通知使用 Promise.all 非同步發送，不會阻塞訂單回應。
若有延遲，檢查伺服器網路狀態。

### 問題 3: 訂單來源顯示不正確

檢查 `/api/order` 是否正確設定 `orderSource: 'shop'`：

```typescript
// 應該看到：
notifyNewOrder({
  // ... 其他欄位
  orderSource: 'shop', // ✅ 必須設定
})
```

---

## 📄 相關代碼位置

| 檔案 | 功能 |
|------|------|
| `app/api/order/route.ts` | 訂單 API（設定 source_from + 調用 notifyNewOrder） |
| `lib/notifications.ts` | notifyNewOrder 函數（建立 Discord Embed） |
| `lib/discord-notifications.ts` | Discord 相關工具函數 |

---

## ✅ 設定完成

完成以上步驟後：

1. ✅ 所有新訂單自動發送到 Discord
2. ✅ 訂單來源標記為「Shop 門市」
3. ✅ 通知格式化並美化
4. ✅ 不影響訂單提交速度

---

**狀態**: 🟢 已部署  
**下一步**: 在 Vercel 設定 DISCORD_WEBHOOK_URL 環境變數
