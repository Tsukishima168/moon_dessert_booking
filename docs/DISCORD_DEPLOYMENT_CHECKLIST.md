# 🎮 Discord 整合 - 部署檢查清單

## ✅ 已完成的功能

### 後台界面
- [x] Discord 設定頁面 (`/admin/discord-settings`)
  - Webhook URL 配置界面
  - 測試通知功能
  - 連接狀態指示
  - 安全 UI (URL 隱藏)

- [x] Admin 儀表板更新
  - Discord 連接狀態指示器
  - 快速連接檢查

- [x] 導航更新
  - Discord 設定菜單項添加到 AdminNav

### API 路由
- [x] `/api/admin/discord-settings` (GET/POST)
  - 檢查 Discord 配置狀態
  - 驗證並儲存 Webhook URL
  - 審計日誌記錄

- [x] `/api/admin/discord-test` (POST)
  - 發送測試訊息
  - 驗證連接有效性

### 通知函數
- [x] `notifyOrderToDiscord()` (discord-notifications.ts)
  - 新訂單通知 🛒
  - 訂單狀態變更通知
  - 取消訂單通知
  - 豐富嵌入式格式

- [x] `notifyMarketingCampaignToDiscord()` (discord-notifications.ts)
  - 行銷活動開始/完成通知
  - 推送統計信息
  - 不同顏色編碼

### 文檔
- [x] 完整 Discord 集成指南 (DISCORD_INTEGRATION_COMPLETE.md)
  - 設定步驟
  - API 文檔
  - FAQ 部分
  - 安全建議

---

## 📋 部署步驟

### 1. 驗證所有檔案已創建
```bash
# 前台
✓ /app/admin/discord-settings/page.tsx
✓ /components/AdminNav.tsx (已更新)

# API
✓ /app/api/admin/discord-settings/route.ts
✓ /app/api/admin/discord-test/route.ts

# 庫
✓ /lib/discord-notifications.ts
✓ /lib/notifications.ts (既存)

# 更新檔案
✓ /app/admin/page.tsx (已更新)

# 文檔
✓ /docs/DISCORD_INTEGRATION_COMPLETE.md
```

### 2. 環境變數配置

#### 開發環境 (.env.local)
```bash
# 已存在
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 新增 (可選，或從後台配置)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/{ID}/{TOKEN}
```

#### 生產環境 (Vercel)
1. 前往 Vercel 控制面板
2. 進入 Dessert-Booking 項目
3. Settings → Environment Variables
4. 新增或更新:
   ```
   DISCORD_WEBHOOK_URL = https://discord.com/api/webhooks/{ID}/{TOKEN}
   ```
5. 重新部署或使用後台 UI 配置

### 3. 測試檢查清單

- [ ] 訪問 `/admin` 頁面 (查看 Discord 狀態指示器)
- [ ] 點擊 Admin Navigation 中的 "Discord 通知"
- [ ] 測試訊息發送功能
- [ ] 檢查 Discord 頻道是否收到測試訊息
- [ ] 驗證訊息格式 (嵌入式訊息)
- [ ] 建立新訂單，驗證 Discord 通知

### 4. 生產部署

#### 通過 Vercel CLI
```bash
vercel env add DISCORD_WEBHOOK_URL
# 輸入 Webhook URL
vercel deploy --prod
```

#### 通過 Web 界面
1. 在 Vercel 上設定環境變數
2. 部署應用

#### 驗證生產部署
```bash
# 檢查部署狀態
curl https://shop.kiwimu.com/api/admin/discord-settings
# 應返回 { "isConfigured": true, "status": "connected" }
```

---

## 🔐 安全檢查

- [x] Webhook URL 不會在日誌中洩露
- [x] 僅管理員可訪問 Discord 設定
- [x] API 端點需要管理員身份驗證
- [x] URL 在 UI 中被遮蔽顯示
- [x] 審計日誌記錄所有設定變更
- [ ] **需要檢查**: Vercel 環境變數是否安全

---

## 📊 集成點

### 訂單系統
需要在以下地點添加通知調用:

```typescript
// /app/api/admin/orders/route.ts (POST 新訂單)
import { notifyOrderToDiscord } from '@/lib/discord-notifications';
await notifyOrderToDiscord(order, 'created');

// /app/api/admin/orders/[orderId]/route.ts (PATCH 狀態變更)
await notifyOrderToDiscord(order, 'status_change');
```

### 行銷模組
```typescript
// /app/api/admin/campaigns/route.ts (POST 活動)
import { notifyMarketingCampaignToDiscord } from '@/lib/discord-notifications';
await notifyMarketingCampaignToDiscord(campaign, 'started');
```

---

## 🐛 故障排除

### 常見問題

**1. 「Webhook URL 無效」**
- ✓ 檢查 URL 格式
- ✓ 確認 Discord 伺服器是否在線
- ✓ 驗證 Webhook 未被刪除

**2. 「未授權」錯誤**
- ✓ 確認登入為管理員
- ✓ 檢查 session 是否有效

**3. 測試訊息未收到**
- ✓ 檢查 Discord 頻道權限
- ✓ 驗證 Webhook 機器人是否有發送權限
- ✓ 查看後台日誌

### 日誌位置
- 前端日誌: 瀏覽器開發工具
- 後端日誌: Vercel 控制面板 → Logs
- 數據庫日誌: Supabase 審計日誌表

---

## 📝 下一步 (可選)

### 短期
- [ ] 在訂單 API 中集成 Discord 通知
- [ ] 在行銷 API 中集成 Discord 通知
- [ ] 為每個事件類型添加 Discord 消息

### 長期
- [ ] 支持多個 Webhook (多頻道)
- [ ] Discord 斜杠命令集成 (`/查詢訂單`)
- [ ] 實時訂單追蹤機器人
- [ ] Discord 直播賣場

---

## 🎯 驗收標準

### 功能驗收
- [ ] 後台 Discord 設定頁面可訪問
- [ ] 可成功保存 Webhook URL
- [ ] 測試通知成功發送到 Discord
- [ ] 訊息格式正確（嵌入式）
- [ ] 只有管理員可訪問 Discord 功能
- [ ] 系統狀態指示器正確顯示連接狀態

### 安全驗收
- [ ] Webhook URL 被安全地加密儲存
- [ ] API 端點已驗證管理員角色
- [ ] 審計日誌記錄所有操作
- [ ] 敏感信息不在前端顯示

### 性能驗收
- [ ] 設定頁面加載 < 2 秒
- [ ] 測試訊息 < 1 秒內發送
- [ ] 無 API 超時

---

## 📞 支援資源

| 資源 | 位置 |
|------|------|
| 完整文檔 | `/docs/DISCORD_INTEGRATION_COMPLETE.md` |
| 設定頁面 | `/app/admin/discord-settings/page.tsx` |
| API 代碼 | `/app/api/admin/discord-*` |
| 通知函數 | `/lib/discord-notifications.ts` |
| Discord 文檔 | https://discord.com/developers/docs/resources/webhook |

---

**狀態**: ✅ 開發完成，待部署
**最後更新**: 2025-02-19
**版本**: 1.0
