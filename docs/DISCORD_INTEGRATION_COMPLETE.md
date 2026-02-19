# 🎮 Discord 訂單通知整合 - 完整指南

## 📌 概述
月島甜點後台系統已完全集成 Discord Webhook 功能，可即時推送訂單通知、行銷活動消息到 Discord 頻道。

---

## 🚀 功能特性

### ✅ 已實現的 Discord 通知類型

#### 1. **訂單通知** (Order Notifications)
- ✓ 新訂單下單通知 🛒
- ✓ 訂單狀態變更通知 (待付款 → 已付款 → 製作中 → 可取貨 → 已完成)
- ✓ 取消訂單通知 ❌
- ✓ 包含商品清單、金額、取貨方式等詳細信息
- ✓ 豐富嵌入式訊息格式 (Rich Embeds)

#### 2. **行銷活動通知** (Marketing Campaign Notifications)
- ✓ 行銷活動開始通知
- ✓ 行銷活動完成通知
- ✓ 推送統計 (發送數、開啟數、點擊數)

#### 3. **系統通知** (System Notifications)
- ✓ 測試訊息
- ✓ 配置驗證
- ✓ 錯誤警告

---

## 🔧 設定步驟

### 步驟 1: 在 Discord 創建 Webhook

1. **開啟 Discord 應用**
   - 進入您想接收訂單通知的伺服器

2. **編輯頻道設定**
   - 右鍵點擊想要接收通知的頻道
   - 選擇 **編輯頻道**

3. **新增 Webhook**
   - 左側選單 → **整合** (Integrations)
   - 點擊 **Webhook**
   - 點 **新增 Webhook**

4. **配置 Webhook**
   - 名稱: `月島甜點訂單 Bot` (或自訂名稱)
   - 可選: 上傳機器人頭像 (例如: 甜點圖片)
   - 選擇要發送訊息的頻道

5. **複製 URL**
   - 點 **複製 Webhook URL**
   - URL 格式: `https://discord.com/api/webhooks/{ID}/{TOKEN}`

### 步驟 2: 在後台配置 Webhook URL

#### 方式 A: 通過後台管理界面 (推薦)

1. 登入月島甜點後台 → 進入 **Discord 通知** 頁面
2. 在 **Webhook URL** 欄位貼上您複製的 URL
3. 點擊 **儲存 Webhook URL**
4. 系統會自動驗證 URL 有效性

#### 方式 B: 通過環境變數 (Vercel)

1. 前往 Vercel 控制面板
2. 進入您的 **Dessert-Booking** 項目
3. 進入 **Settings** → **Environment Variables**
4. 新增變數:
   ```
   Key: DISCORD_WEBHOOK_URL
   Value: https://discord.com/api/webhooks/{ID}/{TOKEN}
   ```
5. 重新部署應用

#### 方式 C: 通過命令行 (開發環境)

```bash
npm run setup:discord -- "https://discord.com/api/webhooks/{ID}/{TOKEN}"
```

### 步驟 3: 測試 Discord 連接

1. 進入後台 → **Discord 通知** 頁面
2. 在 **測試通知** 區域，可選填入測試訊息
3. 點擊 **發送測試訊息**
4. 檢查 Discord 頻道是否收到消息

✅ 如果成功，會看到豐富的嵌入式訊息格式

---

## 📊 通知示例

### 新訂單通知
```
🛒 新訂單
客戶: 張小美
電話: 0912-345-678

📦 商品
• 巧克力蛋糕 x1
• 起司挞 (迷你) x2
• 生日蛋糕 (8吋) x1

💰 金額
NT$1,580

📍 取貨方式
自取: 明天 14:00
```

### 訂單狀態變更通知
```
✅ 已付款
訂單 #ORD-2025-0101

💰 金額
NT$1,580 (已折扣 NT$100)

📍 取貨方式
自取: 明天 14:00
```

### 行銷活動通知
```
📢 行銷活動已開始
活動: 新年特惠 20% OFF

📝 說明
新年感謝祭典

👥 目標客戶
高價值客戶

📊 統計
發送: 245 | 開啟: 89 | 點擊: 34
```

---

## 🔐 安全性

### URL 安全性
- ✓ Webhook URL 在後台被加密儲存
- ✓ 頁面顯示時只顯示部分 URL (隱藏敏感部分)
- ✓ 審計日誌記錄所有 URL 更新

### 最佳實踐
1. **不要分享 Webhook URL**
   - URL 是機密信息，能用於發送消息
   - 如果 URL 洩露，立即在 Discord 重新生成新 Webhook

2. **定期檢查**
   - 檢查 Discord 伺服器的 Webhook 清單
   - 刪除已不需要的 Webhook

3. **頻道權限**
   - 確保機器人只有在指定頻道發送消息的權限
   - 限制 Webhook 的權限範圍

---

## 🔗 相關 API 路由

### 1. 檢查 Discord 設定狀態
```
GET /api/admin/discord-settings
```
**Response:**
```json
{
  "isConfigured": true,
  "status": "connected",
  "message": "Discord Webhook 已設定"
}
```

### 2. 保存 Webhook URL
```
POST /api/admin/discord-settings
Content-Type: application/json

{
  "webhookUrl": "https://discord.com/api/webhooks/{ID}/{TOKEN}"
}
```

### 3. 發送測試通知
```
POST /api/admin/discord-test
Content-Type: application/json

{
  "message": "自訂測試訊息" // 可選
}
```

---

## 📱 在行銷模組中使用 Discord

### 行銷活動通知
當創建行銷活動時，系統會自動向 Discord 發送通知:

```typescript
import { notifyMarketingCampaignToDiscord } from '@/lib/discord-notifications';

// 活動開始時
await notifyMarketingCampaignToDiscord(campaign, 'started');

// 活動完成時
await notifyMarketingCampaignToDiscord(campaign, 'completed');
```

### 自動化行銷觸發
訂閱 Discord 通知，了解自動化行銷規則的執行情況:
- Email 發送成功
- SMS 推送完成
- LINE 訊息已傳達
- 推播通知已發送

---

## 🐛 常見問題 (FAQ)

### Q1: 為什麼收不到 Discord 訊息?
**A:** 檢查以下項目:
1. Webhook URL 是否正確貼入
2. Discord 伺服器是否在線
3. 頻道是否允許機器人發送消息
4. 查看後台日誌是否有錯誤訊息

### Q2: 如何更改接收通知的 Discord 頻道?
**A:** 
1. 在新頻道創建新 Webhook
2. 複製新的 Webhook URL
3. 在後台更新 URL
4. 刪除舊 Webhook

### Q3: 可以同時發送到多個 Discord 頻道嗎?
**A:** 目前系統支援單一 Webhook。如需多頻道，需要:
1. 使用 Discord 頻道轉發功能
2. 或聯繫開發者添加多 Webhook 支援

### Q4: Webhook 過期了怎麼辦?
**A:** 
1. 在 Discord 重新生成 Webhook URL
2. 複製新 URL
3. 在後台重新配置
4. 發送測試訊息驗證

### Q5: 可以自訂通知訊息格式嗎?
**A:** 可以。編輯 `/lib/discord-notifications.ts` 檔案，修改嵌入式訊息的格式。

---

## 🚀 高級功能 (計劃中)

- [ ] 多 Webhook 支援 (多個 Discord 伺服器)
- [ ] 通知模板自訂
- [ ] Discord 命令集成 (如 `/查詢訂單`)
- [ ] 實時訂單追蹤機器人
- [ ] Discord 直播賣場整合

---

## 📞 技術支援

- 檢查文件: `/docs/DISCORD_SETUP_FOR_DESSERT_BOOKING.md`
- 查看源代碼: `/lib/discord-notifications.ts`
- API 路由: `/app/api/admin/discord-*`
- 前台: `/app/admin/discord-settings`

---

## 📝 相關檔案

```
/app/admin/discord-settings/page.tsx          # Discord 設定頁面
/app/api/admin/discord-settings/route.ts     # 設定 API
/app/api/admin/discord-test/route.ts         # 測試 API
/lib/discord-notifications.ts                # Discord 通知函數
/lib/notifications.ts                        # 核心 sendDiscordNotify 函數
/scripts/setup-discord-env.sh                # CLI 設定腳本
```

---

**最後更新**: 2025-02-19
**版本**: 1.0
**狀態**: ✅ 生產就緒
