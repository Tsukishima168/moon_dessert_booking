# 🌟 MBTI 整合指南

## 📋 整合步驟

### 第一步：建立資料表（2 分鐘）

在 Supabase SQL Editor 執行：

```bash
scripts/MBTI_INTEGRATION.sql
```

這會建立：
- `mbti_recommendations` 表（MBTI 推薦）
- 在 `orders` 表加入 `mbti_type` 和 `from_mbti_test` 欄位

---

### 第二步：填入推薦資料（5 分鐘）

在 Supabase → Table Editor → mbti_recommendations

手動新增推薦，或執行 SQL：

```sql
INSERT INTO mbti_recommendations (mbti_type, menu_item_id, reason, priority)
VALUES 
  ('INFP', 'your-menu-item-id', '溫柔療癒，適合敏感細膩的你', 10),
  ('ENFJ', 'another-item-id', '溫暖人心，就像你的熱情', 9);
```

**取得 menu_item_id：**
```sql
SELECT id, name FROM menu_items;
```

---

### 第三步：從 MBTI 網站跳轉

在您的 MBTI 測驗網站（kiwimu-mbti.vercel.app）：

```javascript
// 測驗完成後
const mbtiType = 'INFP'; // 測驗結果

// 跳轉到訂購網站
window.location.href = `https://your-dessert-site.vercel.app?mbti=${mbtiType}`;
```

---

## 🎯 使用方式

### 方式 1：URL 參數

直接在網址加上 MBTI 參數：

```
https://your-site.com?mbti=INFP
```

訂購網站會：
1. 顯示「FOR INFP」標語
2. 優先顯示推薦商品
3. 標記「推薦」標籤
4. 顯示推薦理由

### 方式 2：從測驗網站按鈕

在測驗結果頁面加上按鈕：

```html
<a href="https://dessert-site.com?mbti=INFP&order=true">
  立即訂購靈魂甜點 →
</a>
```

---

## 📊 資料結構

### mbti_recommendations 表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| mbti_type | TEXT | MBTI 類型（INFP, ENFJ, etc.） |
| menu_item_id | UUID | 推薦的商品 ID |
| reason | TEXT | 推薦理由 |
| priority | INT | 優先順序（越大越優先） |

### orders 表（新增欄位）

| 欄位 | 類型 | 說明 |
|------|------|------|
| mbti_type | TEXT | 客戶的 MBTI 類型 |
| from_mbti_test | BOOLEAN | 是否來自 MBTI 測驗 |

---

## 🎨 前端效果

### 無 MBTI 參數
```
🌙 MOON MOON
月島甜點訂購系統

[所有商品按分類顯示]
```

### 有 MBTI 參數
```
🌙 MOON MOON
✨ FOR INFP
為您推薦 3 款靈魂甜點

━━━ 為您推薦 ━━━
[推薦] 芒果班戟  「溫柔療癒，適合敏感細膩的你」
[推薦] 抹茶紅豆  「夢幻甜美，讓心靈得到撫慰」

━━━ 或探索所有商品 ━━━
[所有商品...]
```

---

## 📈 數據分析

### 查詢各 MBTI 類型的訂單

```sql
SELECT 
  mbti_type,
  COUNT(*) as order_count,
  SUM(total_price) as total_revenue,
  ROUND(AVG(total_price)) as avg_order_value
FROM orders
WHERE mbti_type IS NOT NULL
GROUP BY mbti_type
ORDER BY order_count DESC;
```

### 查詢來自 MBTI 測驗的轉換率

```sql
SELECT 
  COUNT(*) FILTER (WHERE from_mbti_test = true) as from_mbti,
  COUNT(*) as total_orders,
  ROUND(
    COUNT(*) FILTER (WHERE from_mbti_test = true)::NUMERIC / COUNT(*) * 100, 
    2
  ) as conversion_rate_percent
FROM orders;
```

---

## 🔗 完整流程範例

### 在 MBTI 網站的測驗結果頁面

```javascript
// kiwimu-mbti.vercel.app/result

function handleOrderClick(mbtiType) {
  // 儲存到 localStorage
  localStorage.setItem('user_mbti', mbtiType);
  
  // 跳轉到訂購網站
  const orderUrl = new URL('https://dessert-booking.vercel.app');
  orderUrl.searchParams.set('mbti', mbtiType);
  orderUrl.searchParams.set('from', 'mbti-test');
  
  window.open(orderUrl.toString(), '_blank');
}
```

---

## 💡 推薦設定建議

### 16 種 MBTI 類型建議

| MBTI | 推薦風格 | 範例理由 |
|------|---------|---------|
| **INFP** | 療癒、夢幻 | 溫柔細膩，撫慰敏感的心 |
| **ENFJ** | 溫暖、分享 | 熱情如你，適合與人分享 |
| **INTJ** | 精緻、經典 | 理性優雅，品味獨到 |
| **ENFP** | 繽紛、創意 | 充滿驚喜，激發靈感 |
| **ISTJ** | 經典、可靠 | 品質保證，值得信賴 |
| **ESFP** | 活力、社交 | 熱鬧有趣，派對首選 |

### 每個 MBTI 建議推薦 2-5 款商品

---

## ✅ 測試清單

- [ ] 執行 MBTI_INTEGRATION.sql
- [ ] 填入至少 1 個 MBTI 類型的推薦
- [ ] 測試 URL：`localhost:3000?mbti=INFP`
- [ ] 確認推薦商品有「推薦」標籤
- [ ] 確認推薦理由顯示
- [ ] 測試下單流程
- [ ] 檢查訂單是否記錄 MBTI

---

## 🎉 完成！

現在您的訂購系統已經完全整合 MBTI 功能了！

客戶從測驗網站跳轉過來，會看到專屬推薦 🌙✨
