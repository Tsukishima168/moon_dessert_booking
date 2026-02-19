# 🚀 Discord 月島訂單通知 - 快速開始 (5分鐘)

## 第1步：取得 Discord Webhook URL (2分鐘)

### 在 Discord 中：
1. **打開伺服器** → 進入想接收訂單通知的頻道
2. **右鍵頻道** → 選 **編輯頻道**
3. 左側 → **整合** → **Webhook** → **新增 Webhook**
4. 名稱填 `月島訂單` 
5. **複製 Webhook URL** (格式: `https://discord.com/api/webhooks/...`)
6. **保存更改**

✅ **Webhook URL 已複製到剪貼板**

---

## 第2步：在後台配置 (2分鐘)

### 方式 A：通過後台 UI (推薦)

1. 登入月島甜點後台管理
2. 進入 **Discord 通知** 頁面 (左側導航)
3. 貼上您的 Webhook URL
4. 點擊 **儲存 Webhook URL**
5. 點擊 **發送測試訊息**

✅ **檢查 Discord 頻道是否收到粉色測試訊息**

### 方式 B：通過環境變數 (開發)

編輯 `.env.local`:
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/{ID}/{TOKEN}
```

重啟開發伺服器:
```bash
npm run dev
```

---

## 第3步：測試通知 (1分鐘)

### 驗證 Discord 連接
1. 在後台 Discord 設定頁面
2. 在 **測試通知** 區域輸入自訂訊息 (可選)
3. 點 **發送測試訊息**
4. 檢查 Discord 頻道

✅ **應該看到這樣的訊息**:
```
🧪 月島甜點 - 測試通知
這是一條測試訊息

頁腳: 月島甜點訂單系統
時間戳記
```

---

## 🎯 現在可以做什麼？

### ✅ 已設定
- [x] 後台可訪問 Discord 設定
- [x] 發送測試通知
- [x] 檢查連接狀態

### ⏳ 待配置
- [ ] 在訂單系統中添加 Discord 通知
- [ ] 在行銷模組中添加 Discord 通知
- [ ] 生產環境部署

---

## 📱 自動訂單通知 (開發者實現)

### 新訂單時自動發送

編輯 `/app/api/admin/orders/route.ts`:

```typescript
import { notifyOrderToDiscord } from '@/lib/discord-notifications';

// 在 POST 新訂單後添加:
await notifyOrderToDiscord(order, 'created');
```

### 訂單狀態變更時自動發送

編輯 `/app/api/admin/orders/[orderId]/route.ts`:

```typescript
// 在 PATCH 狀態變更後添加:
await notifyOrderToDiscord(order, 'status_change');
```

---

## 🔐 安全提示

⚠️ **不要分享您的 Webhook URL** - 任何人都可用它發送訊息到您的頻道

🔒 如果 URL 洩露：
1. 在 Discord 伺服器刪除舊 Webhook
2. 建立新 Webhook
3. 更新後台設定

---

## 📊 通知示例

### 新訂單 🛒
```
客戶: 張小美
電話: 0912-345-678
商品: 巧克力蛋糕 x1
金額: NT$580
時間: 明天 14:00
```

### 狀態變更 ✅
```
已付款
訂單 #ORD-2025-0101
金額: NT$1,580
```

---

## ❓ 常見問題

**Q: 為什麼沒收到測試訊息？**
A: 檢查以下項目：
- Webhook URL 是否正確
- Discord 伺服器是否在線
- 頻道機器人是否有權限

**Q: 如何改變接收頻道？**
A: 建立新 Webhook，更新後台設定

**Q: 可以同時發送到多個頻道嗎？**
A: 目前不支援，需聯繫開發者

---

## 📞 需要幫助？

- 查看完整文檔: `/docs/DISCORD_INTEGRATION_COMPLETE.md`
- 後台設定頁面: `/admin/discord-settings`
- 提交問題: 聯繫開發團隊

---

**✅ 完成！現在 Discord 已連接月島甜點訂單系統** 🎉

下次訂單會自動推送到 Discord 頻道！
