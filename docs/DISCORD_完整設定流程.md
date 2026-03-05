# Discord 完整設定流程

> Kiwimu 宇宙：MBTI Bot + 訂單通知 Webhook

---

## 架構說明

| 功能 | 類型 | 用途 | 顯示名稱 |
|------|------|------|----------|
| **MBTI 驗證** | Discord Bot | /verify、/state、身份組發放 | 你的 Bot 名稱 |
| **測驗完成通知** | Webhook | 有人完成 MBTI 測驗時 | KIWIMU Lab Bot |
| **訂單成立通知** | Webhook | 顧客下單時 | 月島訂單 Bot |

**重要**：訂單通知**不需要新 Bot**，用 **Webhook** 即可。建立 Webhook 時可以自訂名稱與頭像，在頻道裡會以「月島訂單 Bot」出現，和 MBTI Bot 分開。

---

## 一、訂單通知 Webhook（Dessert-Booking）

### Step 1：在 Discord 建立 Webhook

1. 開啟 Discord → Kiwimu宇宙 Server  
2. 點進 **#store-info** 或 **#dessert-bookings**（或新建一個只給夥伴看的頻道）  
3. 頻道右鍵 → **編輯頻道**  
4. 左側 **整合** → **Webhook** → **新增 Webhook**  
5. 名稱：`月島訂單 Bot`  
6. 點 **複製 Webhook URL**  

### Step 2：設定 Dessert-Booking

在專案目錄執行（把 URL 換成你複製的）：

```bash
cd /Users/penstudio/Desktop/Dessert-Booking
npm run setup:discord -- "https://discord.com/api/webhooks/你的ID/你的Token"
```

### Step 3：重新部署

```bash
npx vercel --prod
```

完成後，每次有訂單成立，該頻道會收到通知。

---

## 二、MBTI Bot（color-of-kiwimu-mbti-lab-v5）

MBTI Bot 負責 `/verify`、`/state` 與身份組發放，需要**持續運行**。

### 環境需求

- `DISCORD_TOKEN`：Bot Token  
- `DISCORD_CLIENT_ID`：Application ID  
- `DISCORD_GUILD_ID`：Server ID  
- Firebase Admin SDK：`firebase-adminsdk-key.json`  

### 執行方式

```bash
cd /Users/penstudio/Desktop/color-of-kiwimu-mbti-lab-v5/discord-bot
npm install
```

建立 `.env`：

```
DISCORD_TOKEN=你的Bot_Token
DISCORD_CLIENT_ID=你的Application_ID
DISCORD_GUILD_ID=你的Server_ID
```

啟動：

```bash
npm start
```

Bot 必須保持運行（本機或部署到 Railway、Render 等），否則 `/verify`、`/state` 會沒有回應。

**本機持續運行**（終端機要開著）：
```bash
cd discord-bot
npm start
```

若關閉終端機，Bot 會離線。若要 24 小時運行，可部署到 [Railway](https://railway.app) 或 [Render](https://render.com)。

---

## 三、頻道建議與權限

| 頻道 | 用途 | 建議可見對象 |
|------|------|--------------|
| **#store-info** 或 **#dessert-booking** | 訂單通知 | 只有你跟夥伴 |
| **#results** | MBTI 測驗完成通知 | 依你需求 |
| **#events** | 活動公告 | 所有人 |

若要「僅夥伴可見」：

1. 頻道 → 編輯頻道 → 權限  
2. 新增「店員」或「夥伴」角色並給「查看頻道」  
3. 對 `@everyone` 取消「查看頻道」  

---

## 四、檢查清單

**訂單通知**
- [ ] 在 Discord 建立 Webhook 並複製 URL  
- [ ] 執行 `npm run setup:discord -- "URL"`  
- [ ] 執行 `npx vercel --prod` 重新部署  
- [ ] 下測試訂單確認 Discord 有收到  

**MBTI Bot**
- [ ] `.env` 有 DISCORD_TOKEN、CLIENT_ID、GUILD_ID  
- [ ] `firebase-adminsdk-key.json` 存在  
- [ ] 執行 `npm start` 後 Bot 顯示上線  
- [ ] 在 Discord 輸入 `/verify` 測試  
