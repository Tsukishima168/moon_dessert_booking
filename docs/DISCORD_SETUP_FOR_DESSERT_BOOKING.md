# Discord 訂單通知設定（Dessert-Booking）

> 你的 Discord 已有 Kiwimu MBTI 專案在用。這裡教你讓**甜點預訂系統**的新訂單也通知到同一個 Discord。

---

## 一、Dessert-Booking 與 Kiwimu Discord 的關係

| 專案 | 用途 | Webhook 頻道建議 |
|------|------|------------------|
| **color-of-kiwimu-mbti-lab-v5** | 測驗完成時通知 | `results` 或你現在用的頻道 |
| **Dessert-Booking** | 有新訂單時通知 | `dessert-booking`（甜點相關） |

可以用**同一個 Discord Server**，但要建立**不同的 Webhook**，分別接到不同頻道。

---

## 二、建立訂單通知的 Webhook（約 1 分鐘）

1. 開啟 Discord → 進入你的 Kiwimu Server  
2. 在 `dessert-booking` 頻道（或你想收訂單的頻道）右鍵 → **編輯頻道**  
3. 左側選 **整合** → **Webhook**  
4. 點 **新增 Webhook**  
5. 名稱可填：`月島訂單 Bot`  
6. 點 **複製 Webhook URL**  

這個 URL 格式會是：`https://discord.com/api/webhooks/123456789/xxxxxxxxx`

---

## 三、在 Vercel 設定環境變數

### 方式 A：用指令（推薦）

專案已連結 Vercel。取得 Webhook URL 後，在專案目錄執行：

```bash
npm run setup:discord -- "https://discord.com/api/webhooks/你的ID/你的Token"
```

會自動加入 production / preview / development 環境，完成後執行 `npx vercel --prod` 重新部署。

### 方式 B：手動在 Vercel 設定

1. 開啟 [Vercel Dashboard](https://vercel.com) → 選 **Dessert-Booking** 專案  
2. **Settings** → **Environment Variables**  
3. 新增 `DISCORD_WEBHOOK_URL`，值為你複製的 Webhook URL  
4. 儲存後到 **Deployments** 重新部署  

---

## 四、完成後的行為

設定成功後，每當有顧客下單，你的 Discord `dessert-booking` 頻道會收到類似訊息：

```
老闆，有新訂單來囉！
訂單編號: XXX-XXXX
客戶、金額、取貨時間、商品明細...
```

---

## 五、與 MBTI 專案的 Webhook 區分

- **MBTI 專案**：繼續用 `DISCORD_WEBHOOK_URL`（測驗完成通知）→ 建議接到 `results`  
- **Dessert-Booking**：也用 `DISCORD_WEBHOOK_URL`，但接到 `dessert-booking`  

兩個專案的 Vercel 各自設定自己的 Webhook URL，不會互相影響。

---

## 六、檢查清單

- [ ] 已在 Discord 建立 `dessert-booking` 頻道（或選定其他頻道）
- [ ] 已建立 Webhook 並複製 URL
- [ ] 已在 Dessert-Booking 的 Vercel 專案新增 `DISCORD_WEBHOOK_URL`
- [ ] 已重新部署
- [ ] 實際下一筆測試訂單，確認 Discord 有收到通知

---

**Email 設定（moonbakery168.com）**：稍晚要設定的話，可以照 `docs/EMAIL_GOOGLE_DOMAIN_SETUP.md` 操作，需要時再說。
