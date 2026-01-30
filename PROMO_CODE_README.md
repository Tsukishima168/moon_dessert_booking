# 🎫 優惠碼系統 - 快速開始

## ⚡ 3 步驟啟用優惠碼系統

### 步驟 1：執行 SQL 腳本
1. 打開 [Supabase Dashboard](https://supabase.com/dashboard)
2. 進入 SQL Editor
3. 複製貼上 `scripts/PROMO_CODE_SETUP.sql` 的內容
4. 點擊 **Run** 執行

### 步驟 2：重啟開發伺服器
```bash
# 停止目前的伺服器 (Ctrl+C)
# 然後重新啟動
npm run dev
```

### 步驟 3：測試優惠碼
1. 加入商品到購物車
2. 前往結帳頁面
3. 在「PROMO CODE」欄位輸入測試優惠碼
4. 點擊 **APPLY**

---

## 🎁 預設測試優惠碼

系統已自動建立 4 個測試優惠碼：

| 優惠碼 | 類型 | 折扣 | 最低消費 | 說明 |
|--------|------|------|----------|------|
| `WELCOME10` | 百分比 | 10% | 無 | 新客戶歡迎優惠 |
| `SAVE20` | 百分比 | 20% | $500 | 滿500享8折 |
| `FIRST50` | 固定 | $50 | $300 | 首購折50元 |
| `MOON100` | 固定 | $100 | $1000 | 滿1000折100 |

---

## 💡 快速範例

### 新增一個優惠碼

在 Supabase Dashboard > Table Editor > promo_codes：

```
code: LUNAR2026
discount_type: percentage
discount_value: 15
min_order_amount: 0
description: 月島限定15%折扣
```

### 客戶使用流程

1. **加入商品** → 購物車 $600
2. **輸入優惠碼** → `SAVE20`
3. **系統驗證** → ✅ 符合條件（滿$500）
4. **自動折扣** → $600 × 20% = -$120
5. **結帳金額** → $480

---

## 📱 前端顯示

### 結帳頁面 - 優惠碼輸入

```
┌─────────────────────────────────────┐
│ 🎫 PROMO CODE                       │
├─────────────────────────────────────┤
│ [SAVE20          ]  [APPLY]         │
└─────────────────────────────────────┘
```

### 結帳頁面 - 已套用

```
┌─────────────────────────────────────┐
│ 🎫 PROMO CODE                       │
├─────────────────────────────────────┤
│ 🎫 SAVE20 (-$120)            [X]    │
└─────────────────────────────────────┘

ORDER SUMMARY
───────────────────────────────────────
SUBTOTAL                         $600
DISCOUNT (SAVE20)               -$120
───────────────────────────────────────
TOTAL                            $480
```

### 購物車側邊欄

```
YOUR CART
2 ITEMS

商品列表...

───────────────────────────────────────
SUBTOTAL                         $600
DISCOUNT (SAVE20)               -$120
───────────────────────────────────────
TOTAL                            $480

[PROCEED TO CHECKOUT]
```

---

## 📊 如何管理優惠碼

### 查看所有優惠碼

進入 Supabase Dashboard > Table Editor > `promo_codes`

或執行 SQL：
```sql
SELECT code, discount_type, discount_value, used_count, is_active 
FROM promo_codes 
ORDER BY created_at DESC;
```

### 停用優惠碼

在 Table Editor 中，將 `is_active` 改為 `false`

### 查看使用紀錄

```sql
SELECT order_id, promo_code, discount_amount, final_price
FROM orders
WHERE promo_code IS NOT NULL
ORDER BY created_at DESC;
```

---

## ✅ 功能特色

- ✅ **兩種折扣類型**：百分比 / 固定金額
- ✅ **最低消費限制**：滿額才能使用
- ✅ **使用次數控制**：限量優惠
- ✅ **有效期限設定**：限時優惠
- ✅ **即時驗證**：立即檢查是否有效
- ✅ **自動計算**：系統自動扣除折扣
- ✅ **Email 顯示**：客戶收到的確認信會顯示優惠碼
- ✅ **LINE 通知**：店家收到的通知會顯示使用的優惠碼

---

## 📖 完整文檔

詳細設定請參考：**`docs/PROMO_CODE_GUIDE.md`**

---

## 🚀 現在就試試看！

1. 執行 SQL 腳本 ✅
2. 重啟開發伺服器 ✅
3. 測試 `WELCOME10` 優惠碼 ✅

**優惠碼系統準備完成！** 🎉
