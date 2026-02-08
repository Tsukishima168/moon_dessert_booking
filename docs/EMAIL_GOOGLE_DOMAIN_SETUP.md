# 📧 Resend + moonbakery168.com（Google 網域）設定步驟

> 專為 **moonbakery168.com** 與 **Google / Squarespace 網域** 撰寫

---

## 前置說明

- **網域**：moonbakery168.com  
- **DNS 管理**：Google Domains 或 Squarespace Domains（Google 網域業務已移交 Squarespace）

若你的網域已遷到 Squarespace，請到 [Squarespace](https://account.squarespace.com) 登入；若仍在 Google，請到 [domains.google.com](https://domains.google.com) 登入。

---

## 一、在 Resend 新增網域

1. 前往 [resend.com/domains](https://resend.com/domains)
2. 點 **Add Domain**
3. 輸入：`moonbakery168.com` 或子網域 `mail.moonbakery168.com`（建議用子網域）
4. 按 **Add**
5. Resend 會顯示需要設定的 **SPF** 和 **DKIM** 紀錄，先不要關閉此畫面

---

## 二、到 Google / Squarespace 新增 DNS 紀錄

### 若使用 Google Domains（domains.google.com）

1. 登入 [domains.google.com](https://domains.google.com)
2. 點選 **moonbakery168.com**
3. 左側選單 → **DNS** 或 **DNS 紀錄**
4. 捲到 **自訂資源紀錄** 或 **Custom resource records**

#### 新增 SPF（第一筆 TXT）

| 欄位 | 填入內容 |
|------|----------|
| **類型** | TXT |
| **主機名稱** | `send`（若 Resend 寫 `send.moonbakery168.com`，這裡只填 `send`） |
| **TTL** | 3600 或 1H |
| **資料** | Resend 給的 SPF 值，例如：`v=spf1 include:amazonses.com ~all` |

#### 新增 DKIM（第二筆 TXT）

| 欄位 | 填入內容 |
|------|----------|
| **類型** | TXT |
| **主機名稱** | Resend 顯示的 DKIM 主機名（例如 `resend._domainkey`，通常只填前半段） |
| **TTL** | 3600 或 1H |
| **資料** | Resend 給的 DKIM 值（一長串） |

> **注意**：主機名稱欄位若已有 `moonbakery168.com` 後綴，就只填 `send`、`resend._domainkey` 等；若沒有，依 Resend 畫面指示填寫。

5. 每筆填完都按 **儲存**

---

### 若使用 Squarespace Domains

1. 登入 [account.squarespace.com](https://account.squarespace.com)
2. 點 **Domains** → 選擇 **moonbakery168.com**
3. 點 **DNS Settings** 或 **進階設定**
4. 在 **Custom Records** 區塊點 **Add Record**

#### 新增 SPF

| 欄位 | 填入 |
|------|------|
| **Type** | TXT |
| **Host** | `send` |
| **Data** | `v=spf1 include:amazonses.com ~all`（或 Resend 顯示的完整值） |

#### 新增 DKIM

| 欄位 | 填入 |
|------|------|
| **Type** | TXT |
| **Host** | Resend 給的 DKIM 主機名 |
| **Data** | Resend 給的 DKIM 值 |

5. 儲存

---

## 三、回 Resend 驗證

1. 等 **5–15 分鐘** 讓 DNS 生效
2. 回到 Resend → Domains → moonbakery168.com
3. 點 **Verify DNS Records**
4. 狀態變成 **Verified** 即完成

---

## 四、設定環境變數

在 Vercel 的環境變數加上：

```
RESEND_API_KEY=re_你的API金鑰
RESEND_FROM_EMAIL=orders@moonbakery168.com
```

若使用子網域 `mail.moonbakery168.com`，則：

```
RESEND_FROM_EMAIL=orders@mail.moonbakery168.com
```

儲存後重新部署。

---

## 五、快速檢查

- [ ] Resend 已新增網域 moonbakery168.com
- [ ] 已在 DNS 新增 SPF（TXT）
- [ ] 已在 DNS 新增 DKIM（TXT）
- [ ] Resend 顯示網域為 Verified
- [ ] Vercel 已設定 RESEND_API_KEY 和 RESEND_FROM_EMAIL
- [ ] 已重新部署並測試寄信

---

## 常見狀況

**Q：主機名稱欄位要填什麼？**  
A：若 Resend 寫 `send.moonbakery168.com`，在 Google/Squarespace 的主機名稱欄位通常只填 `send`。每家介面不同，以 Resend 實際顯示為準。

**Q：驗證一直失敗？**  
A：再等 10–15 分鐘，並確認 TXT 內容完全照 Resend 複製，沒有多餘空格或引號。

**Q：想用 orders@moonbakery168.com 寄信？**  
A：可以。用根網域 `moonbakery168.com` 時，SPF/DKIM 的主機名稱通常會是 `send` 或 `@`，依 Resend 指示設定即可。
