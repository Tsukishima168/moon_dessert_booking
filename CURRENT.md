# CURRENT.md — shop.kiwimu.com

## Snapshot · 2026-04-01

Status: `可驗證交付候選`

已完成驗證：
- `npm run build` 通過
- `npm run start -- -p 3101` 可啟動
- `curl -I http://127.0.0.1:3101/` → `200 OK`
- `curl -I http://127.0.0.1:3101/checkout` → `200 OK`
- `curl -I http://127.0.0.1:3101/auth/login` → `200 OK`
- `app/api/user/*` 已明確標記為 dynamic，build 不再出現 cookie-based route 的靜態判定噪音

## 目前 Blockers

1. `LINE Pay` 憑證未就位，無法做 request/confirm 端到端付款驗證。
2. 需要真人帳號驗證的流程尚未走完：`/account`、`/api/user/*`、admin gated flows。
3. 外部整合尚未做真人驗證：`Resend`、`Discord webhook`、`n8n webhook`、`GA4 key events`。
4. worktree 內有既存變動：`.claude/launch.json` 顯示為刪除，這次未處理。

## 最小交付清單

- 本機 build/start/smoke 可重現：已完成
- 首頁/結帳/登入頁可回應：已完成
- 非 LINE Pay 的下單路徑可完成一次本機驗證：待完成
- admin 基本操作（登入、訂單、菜單）可完成一次 smoke：待完成
- 外部通知與付款回調有真人驗證紀錄：待完成
- `CURRENT.md` / `LOG.md` 已建立：已完成

## 今晚可以直接做的項目

- 用測試帳號走一次購物車 → checkout → submit（先走非 LINE Pay 路徑）
- 做一次 admin login / orders / menu smoke
- 若 webhook 憑證可用，驗證下單後的 email / Discord / n8n 出站
- 補一份簡短截圖或錄影證據，作為交付附件

## 需要真人參與的驗證項目

- `LINE Pay` sandbox 或正式 request/confirm/cancel 流程
- 實際收件匣收到訂單信
- 實際 Discord 頻道收到通知
- 手機端或 LINE 內建瀏覽器完成 checkout 與登入驗證

