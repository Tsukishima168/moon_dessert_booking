# ⚡ 快速部署指南 - 一鍵推送到 Git + Vercel

**用途:** 快速提交代碼變更並自動部署到 Vercel  
**時間:** 30 秒 - 2 分鐘  
**部署時間:** 2-5 分鐘 (Vercel 自動構建)

---

## 🚀 最快速方式 (推薦)

### 方式 1: 一行命令快速提交

```bash
cd /Users/pensoair/Desktop/網路開發專案/Dessert-Booking && git add . && git commit -m "feat: 快速更新" && git push origin main
```

**效果:**
1. ✅ 暫存所有改動
2. ✅ 提交代碼
3. ✅ 推送到 GitHub
4. ✅ Vercel 自動部署

---

## 📝 有描述信息的提交 (推薦)

### 方式 2: 自訂提交信息

```bash
cd /Users/pensoair/Desktop/網路開發專案/Dessert-Booking && \
git add . && \
git commit -m "feat: [你的改動描述]

- 改動1
- 改動2" && \
git push origin main
```

**範例:**
```bash
git commit -m "feat: 新增優惠碼批量生成功能

- 添加批量生成界面
- 實現 CSV 導出
- 添加統計圖表"
```

---

## 🔄 標準流程 (詳細)

如果想逐步操作：

```bash
# 1. 進入項目目錄
cd /Users/pensoair/Desktop/網路開發專案/Dessert-Booking

# 2. 查看改動
git status

# 3. 暫存所有改動
git add .

# 4. 提交代碼
git commit -m "feat: 你的提交信息"

# 5. 推送到 GitHub
git push origin main

# 6. 查看部署狀態
git log --oneline -1
```

---

## 🎯 常用提交信息模板

| 類型 | 範例 |
|------|------|
| 新功能 | `feat: 新增優惠碼批量生成` |
| 修復 | `fix: 修復郵件發送問題` |
| 改進 | `refactor: 優化菜單加載性能` |
| 文檔 | `docs: 更新部署指南` |
| 樣式 | `style: 調整深色主題顏色` |
| 測試 | `test: 添加單元測試` |

---

## ✅ 部署檢查清單

提交後，按照以下流程確認部署：

```
□ 代碼提交成功 (git commit)
  └─ 檢查: git log --oneline -1

□ 推送到 GitHub (git push)
  └─ 檢查: GitHub 倉庫主頁看最新提交

□ Vercel 自動部署 (2-5 分鐘)
  └─ 檢查: https://vercel.com/dashboard
  └─ 或: https://shop.kiwimu.com (查看實時站點)

□ 部署完成
  └─ 檢查: 站點功能正常 ✅
```

---

## 🔗 快速連結

| 項目 | 鏈接 |
|------|------|
| 生產環境 | https://shop.kiwimu.com |
| GitHub 倉庫 | https://github.com/Tsukishima168/moon_dessert_booking |
| Vercel Dashboard | https://vercel.com/dashboard |

---

## 💡 提示

**自動部署工作流:**
```
你的提交 → GitHub → Vercel 檢測推送 → 自動構建 → 自動部署 → 線上更新
```

**不需要手動操作 Vercel，完全自動！**

---

## 📊 部署時間參考

| 步驟 | 耗時 |
|------|------|
| Git 提交 + 推送 | 10-30 秒 |
| GitHub 同步 | 5-10 秒 |
| Vercel 檢測 | 5-10 秒 |
| Vercel 構建 | 1-2 分鐘 |
| 部署上線 | 10-30 秒 |
| **總計** | **2-5 分鐘** |

---

**最後更新:** 2026-03-06  
**實施者:** Claude Haiku (GitHub Copilot)  

*快速部署，零手動操作，完全自動化 🚀*
