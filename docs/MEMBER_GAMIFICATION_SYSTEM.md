# 🎮 月島甜點 - 會員系統 + 遊戲化完整方案

## 📋 架構概述

```
線上訂單                    現場訂單
(網頁)                      (LINE LIFF)
  ↓                            ↓
月島訂購系統  ←→  N8N 自動化  ←→  Google Sheet
  ↓
會員系統 (DB)
  ↓
遊戲化引擎
├─ 積分系統
├─ 徽章系統
├─ 排行榜
├─ 任務系統
└─ 等級晉升
```

---

## 1️⃣ 多渠道訂單架構

### 🎯 目前系統 (網頁)
```
網頁訂購
  ↓
月島訂購系統 (Next.js)
  ↓
Supabase orders 表
```

### ➕ 新增：LINE LIFF + N8N + Google Sheet
```
現場訂單流程：
1. 客戶到店 → 掃 LINE QR Code
2. 開啟 LINE LIFF (小程式)
3. 填寫訂單
4. N8N 自動化
   ├─ 存到 Google Sheet
   ├─ 推送到月島系統
   └─ 更新會員積分

架構：
LINE LIFF
  ↓
N8N Webhook
  ↓
├─ Google Sheet (記錄)
├─ 月島 API (系統)
└─ 會員系統 (積分)
```

---

## 2️⃣ 會員分級系統設計

### 🏆 四層分級制

#### 等級 1️⃣：銀卡會員 (Silver)
```
入場條件：首次購買
特權：
- ✓ 基礎積分 (1元 = 1點)
- ✓ 生日優惠 (折扣 10%)
- ✓ 新商品搶先知
- ✓ 專屬徽章

視覺：🪙 銀色

實例：
客戶首購 → 自動升級銀卡
```

---

#### 等級 2️⃣：金卡會員 (Gold)
```
升級條件：年積分 ≥ 5,000 點
          (不只消費，還包括簽到、載具綁定、邀請等)
特權：
- ✓ 積分加成 (1元 = 1.2點)
- ✓ 免運優惠 (滿 $300 免運)
- ✓ 季度優惠碼 (額外 5% OFF)
- ✓ VIP 客服 (優先回應)
- ✓ 新品試吃邀請
- ✓ 金卡專屬徽章

視覺：⭐ 金色

實例：
年積分 5,000 點 → 自動升級金卡
(可組合: 消費 $2000 + 簽到 30 天 + 綁載具 + 邀請 2 人)
掉下來：年內未活躍 → 降級銀卡
```

---

#### 等級 3️⃣：鑽石卡會員 (Platinum)
```
升級條件：年積分 ≥ 15,000 點
升級路徑：
  ├─ 消費 $10,000 (1元=1點起算)
  ├─ 或簽到 60 天 + 消費 $3,000
  ├─ 或綁定載具 + 消費 $2,000 + 邀請 3 人
  └─ 或任意組合達 15,000 點

特權：
- ✓ 積分加成 (1元 = 1.5點)
- ✓ 全年免運
- ✓ 月度尊享禮物
- ✓ 優先訂位預約
- ✓ VIP 專線客服
- ✓ 年度生日禮物 (特製商品)
- ✓ 排行榜排名權
- ✓ 簽到加成 (每日 +5 點)

視覺：💎 鑽石色

實例：
消費 $8000 + 簽到 40 天 + 綁載具 + 邀請 2 人
→ (8000 + 200 + 100 + 100) = 8,400 點，再加邀請加成
→ 升級鑽石卡
```

---

#### 等級 4️⃣：皇冠會員 (Crown)
```
升級條件：年積分 ≥ 30,000 點
升級路徑：
  ├─ 消費 $20,000 (1元=1點起算)
  ├─ 或消費 $10,000 + 簽到 100 天 + 綁載具
  ├─ 或邀請 10 位新客 (各消費 1 次)
  └─ 或任意組合達 30,000 點

特權：
- ✓ 積分加成 (1元 = 2點)
- ✓ 終身免運
- ✓ 每月尊享禮物 + NT$500 購物金
- ✓ 優先客製化服務
- ✓ 專屬帳號經理
- ✓ 年度宴會邀請
- ✓ 排行榜冠軍名額
- ✓ 商品新品命名權 (1年1次)
- ✓ 簽到加成 (每日 +10 點)
- ✓ 載具扣點優惠 (電子發票 +5 點)

視覺：👑 皇冠色

實例：
消費 $15,000 + 簽到 80 天 + 綁載具 + 邀請 3 人
→ (15,000 + 400 + 150 + 150) = 15,700 點
→ 離 30,000 點還有空間，再透過持續簽到、邀請、購物
→ 升級皇冠會員

保留期：終身 (除非年度無消費 + 無簽到)
```

---

### 📊 分級成本分析

| 級別 | 用戶需求 | 月費成本 | 營收貢獻 |
|------|---------|--------|--------|
| 銀卡 | 易達到 | $0 | 低 |
| 金卡 | 消費 $5k | ~$30 | 中 |
| 鑽石卡 | 消費 $15k | ~$80 | 高 |
| 皇冠卡 | 消費 $30k | ~$150 | 超高 |

**成本結構：**
- 免運費損失
- 積分兌換成本
- 購物金發放

---

## 3️⃣ 遊戲化系統詳設

### 🎮 積分系統

#### 積分獲取規則
```
消費積分：NT$1 消費 = 1 點 (銀卡)
           NT$1 消費 = 1.2 點 (金卡)
           NT$1 消費 = 1.5 點 (鑽石卡)
           NT$1 消費 = 2 點 (皇冠卡)

額外積分：
- 首次購買: +100 點
- 介紹朋友: +50 點/人
- 簽到打卡: +10 點/天
- 評價商品: +5 點
- 分享貼文: +10 點
- 完成任務: +20-100 點
- 生日月份: +200 點

積分兌換：
- 100 點 = $20 購物金
- 200 點 = 免運
- 500 點 = $150 購物金 + 精美禮物
```

#### 積分數據結構
```sql
CREATE TABLE member_points (
  id UUID PRIMARY KEY,
  member_id UUID,
  points INT,
  lifetime_points INT, -- 歷史累計
  expired_points INT,
  last_updated TIMESTAMP,
  
  -- 積分細項
  consumption_points INT, -- 消費積分
  bonus_points INT,       -- 額外積分
  redeemed_points INT,    -- 已兌換
  
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 積分交易記錄
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY,
  member_id UUID,
  amount INT,
  type TEXT, -- 'earn', 'redeem', 'expire'
  reason TEXT,
  created_at TIMESTAMP
);
```

---

## 3️⃣ 積分獲得方式 (多元獲得，不只消費)

### 📊 積分來源總表

```
┌─ 消費積分 (購物)
│  ├─ 線上訂購: NT$1 = 1-2 點 (依等級)
│  ├─ 現場訂購: 同上
│  └─ LIFF 訂單: 同上
│
├─ 活動積分 (每日免費)
│  ├─ 簽到: 每日 +5 點
│  ├─ 連簽加成: 7天+20點 / 30天+100點
│  └─ 寒暑假簽到: x2 倍積分
│
├─ 推廣積分 (邀請)
│  ├─ 邀請新客: +50 點 (首次成功)
│  ├─ 連鎖邀請: 邀3人+100點 / 邀5人+200點
│  └─ 邀請排行: 月度邀請王 +300 點
│
├─ 特殊積分 (環保/政策)
│  ├─ 綁定載具: +100 點 (一次性)
│  ├─ 電子發票: 每張 +5 點
│  └─ 響應環保: 自帶容器 +10 點
│
├─ 互動積分 (社群)
│  ├─ 商品評論: +5 點
│  ├─ 上傳照片: +10 點
│  └─ 分享到 SNS: +8 點
│
└─ 任務積分 (週/月/季)
   ├─ 週任務: 100-300 點
   ├─ 月任務: 500-1000 點
   └─ 季度任務: 升級卡級
```

### 🎁 具體積分明細

#### 📦 消費積分
```
基礎比例：
├─ 銀卡: NT$1 = 1 點
├─ 金卡: NT$1 = 1.2 點 (+20%)
├─ 鑽石卡: NT$1 = 1.5 點 (+50%)
└─ 皇冠卡: NT$1 = 2 點 (+100%)

例：
皇冠卡消費 $500
→ $500 × 2 = 1,000 點
→ 加上簽到獎勵 = 1,010 點

新客戶首購獎勵：+50 點
生日月份消費：x 1.5 倍積分
```

#### ✅ 每日簽到積分
```
基礎簽到：
├─ 一般日期: +5 點
├─ 週末: +8 點
└─ 假日: +10 點

連簽加成：
├─ 連簽 7 天: +20 額外點 + 🔥 徽章
├─ 連簽 30 天: +100 額外點 + ⭐ 徽章
├─ 連簽 100 天: +300 額外點 + 👑 徽章
└─ 連簽 365 天: +1000 額外點 (年度成就)

季節加成：
├─ 夏日簽到 (7-8月): x 1.5 倍
├─ 冬日簽到 (12-1月): x 1.5 倍
└─ 週年慶簽到 (月島周年): x 3 倍

簽到挑戰失敗回復：
├─ 補簽卡 (購買): 5 點 = 回復 1 天連簽
├─ VIP 自動回復: 每月 2 次免費回復
└─ 皇冠卡: 每月無限回復
```

#### 📞 邀請推廣積分
```
邀請新客：
├─ 基礎獎勵: +50 點 (受邀人首次購買成功)
├─ 受邀人也獲得: +50 點 (邀請禮)
└─ 雙向受益 (Win-Win)

連鎖邀請加成：
├─ 邀請 3 位新客: 再加 +100 點
├─ 邀請 5 位新客: 再加 +200 點
├─ 邀請 10 位新客: 自動升級鑽石卡 + +500 點
└─ 邀請 20 位新客: 自動升級皇冠卡 + +1000 點

邀請排行榜：
├─ 月度邀請排行前 3: +300 點 + 特殊徽章
├─ 年度邀請排行前 5: +1000 點 + 年度獎品
└─ 邀請排行永久第 1: +100 點/月 + 終身特權

邀請方式：
├─ 分享邀請碼 (通用)
├─ 分享邀請連結 (追蹤)
└─ LINE 邀請 (LINE 好友)
```

#### 🌱 環保特殊積分
```
載具綁定：
├─ 初次綁定: +100 點
├─ 每月綁定時簽到: +5 額外點
└─ 綁定 12 個月: +200 額外點 + 👍 環保徽章

電子發票：
├─ 每張電子發票: +5 點
├─ 月度電子發票 10 張: +50 額外點
└─ 全年電子發票: +300 額外點 + 🌍 環保衛士徽章

自帶容器/環保：
├─ 自帶容器: +10 點
├─ 使用環保吸管: +5 點
└─ 月度環保購買 10 次: +100 額外點 + 🌿 環保標章
```

#### 💬 互動社群積分
```
商品評論：
├─ 留言評論: +5 點
├─ 圖文評論: +10 點 (加分)
├─ 有用評論 (被讚): +5 額外點
└─ 月度最有用評論: +50 額外點 + 📝 徽章

照片上傳：
├─ 上傳商品照片: +10 點
├─ 上傳用餐場景: +15 點
├─ 月度最佳照片: +100 額外點 + 📸 徽章
└─ 照片被轉發: +5 額外點

社群分享：
├─ 分享到 IG / FB: +8 點
├─ 分享獲得留言: +5 額外點
├─ 月度最多分享: +50 點
└─ 成為 Brand Ambassador: +200 點/月
```

#### 🎯 任務積分
```
週任務：
├─ 任務 1: 消費滿 $500 (+100點)
├─ 任務 2: 購買 2 種新商品 (+150點)
├─ 任務 3: 邀請 1 位朋友 (+200點)
├─ 任務 4: 完成商品評價 (+50點)
├─ 任務 5: 連續簽到 3 天 (+100點)
└─ 週任務全達成: +100 額外點

月任務：
├─ 任務 1: 消費滿 $2000 (+300點)
├─ 任務 2: 購買所有商品分類 (+400點)
├─ 任務 3: 邀請 5 位朋友 (+500點)
├─ 任務 4: 成為月度排行榜前 10 (+1000點)
├─ 任務 5: 完成 5 次購買 (+200點)
└─ 月任務全達成: +500 額外點 + 🏆 徽章

特殊活動任務：
├─ 節日挑戰: +200-500 點
├─ 新品品嚐: +50 點
├─ 限時活動: +100-300 點
└─ 週年慶挑戰: +1000+ 點
```

---

### 🏅 徽章系統

#### 徽章類型

| 徽章 | 條件 | 稀有度 | 獎勵 |
|------|------|--------|------|
| 🎉 新手 | 首次購買 | 常見 | +50點 |
| 🔥 購物狂 | 30天內消費 5次 | 常見 | +100點 |
| ⭐ 探險家 | 購買 5 種不同商品 | 不常見 | +150點 |
| 💎 精選品鑑 | 購買最高價商品 | 不常見 | +200點 |
| 🎯 連續簽到 | 連續簽到 7天 | 不常見 | +100點 |
| 👥 社交達人 | 邀請 3 位朋友 | 罕見 | +300點 |
| 🏆 月度冠軍 | 月度消費排行榜前 3 | 罕見 | +500點 + 尊享禮 |
| 👑 傳奇 | 年消費 $50k+ | 傳奇 | 專屬皇冠徽章 |

#### 徽章數據結構
```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  icon_url TEXT,
  rarity TEXT, -- common, uncommon, rare, legendary
  condition JSONB, -- {type: 'purchase_count', value: 5}
  reward_points INT
);

CREATE TABLE member_badges (
  id UUID PRIMARY KEY,
  member_id UUID,
  badge_id UUID,
  unlocked_at TIMESTAMP,
  progress INT, -- 進度 0-100%
  UNIQUE(member_id, badge_id)
);
```

---

### 🎯 任務系統 (每周/每月)

#### 週任務 (獲得 100-300 點)
```
□ 消費滿 $500 (+100點)
□ 購買 2 種新商品 (+150點)
□ 邀請 1 位朋友 (+200點)
□ 完成商品評價 (+50點)
□ 連續簽到 3 天 (+100點)
```

#### 月任務 (獲得 500-1000 點)
```
□ 消費滿 $2000 (+300點)
□ 購買所有商品分類 (+400點)
□ 邀請 5 位朋友 (+500點)
□ 成為月度排行榜前 10 (+1000點)
□ 完成 5 次購買 (+200點)
```

#### 季度任務 (升級卡級)
```
□ 年消費達成 $5000 → 升級金卡
□ 年消費達成 $15000 → 升級鑽石卡
□ 年消費達成 $30000 → 升級皇冠卡
□ 邀請 10 位新客戶 → 升級鑽石卡
```

---

### 📊 排行榜系統

#### 實時排行榜
```
1️⃣ 月度消費排行榜 (更新: 每天)
   - 排名 1-3 獲得徽章 + 積分

2️⃣ 月度簽到排行榜 (更新: 每天)
   - 連續簽到天數比賽
   - Top 10 獲得獎勵

3️⃣ 全年消費排行榜 (更新: 每月)
   - 年度冠軍 → 皇冠卡晉升

4️⃣ 季度新秀排行榜 (更新: 每季)
   - 新會員成長速度比賽
```

#### 排行榜數據結構
```sql
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY,
  name TEXT,
  type TEXT, -- 'monthly', 'yearly', 'seasonal'
  start_date DATE,
  end_date DATE,
  
  -- 排行數據 (視圖自動計算)
  view_name TEXT
);

-- 實時月度排行榜視圖
CREATE OR REPLACE VIEW monthly_leaderboard AS
SELECT 
  rank() OVER (ORDER BY total_spent DESC) as rank,
  member_id,
  SUM(final_price) as total_spent,
  COUNT(*) as order_count
FROM orders
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
GROUP BY member_id
ORDER BY total_spent DESC;
```

---

## 4️⃣ 會員系統數據庫設計

### 核心表結構

```sql
-- 1. 會員主表
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  user_id UUID, -- Passport 用戶 ID (可選)
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  avatar_url TEXT,
  
  -- 等級相關
  level TEXT DEFAULT 'silver', -- silver, gold, platinum, crown
  level_progress INT DEFAULT 0, -- 0-100%
  level_updated_at TIMESTAMP,
  
  -- 消費統計
  total_spent NUMERIC DEFAULT 0,
  year_spent NUMERIC DEFAULT 0, -- 年度消費
  order_count INT DEFAULT 0,
  last_order_date TIMESTAMP,
  
  -- 特殊標記
  is_vip BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  referral_code TEXT UNIQUE,
  referred_by UUID, -- 邀請人
  
  -- 時間戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 積分表
CREATE TABLE member_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE,
  
  total_points INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,
  redeemed_points INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 3. 徽章表
CREATE TABLE member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  badge_name TEXT NOT NULL,
  
  unlocked_at TIMESTAMP DEFAULT NOW(),
  progress INT DEFAULT 100,
  
  FOREIGN KEY (member_id) REFERENCES members(id),
  UNIQUE(member_id, badge_name)
);

-- 4. 簽到記錄
CREATE TABLE member_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  
  checkin_date DATE NOT NULL,
  consecutive_days INT DEFAULT 1,
  points_earned INT DEFAULT 10,
  
  FOREIGN KEY (member_id) REFERENCES members(id),
  UNIQUE(member_id, checkin_date)
);

-- 5. 交易歷史
CREATE TABLE member_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL,
  order_id UUID,
  
  type TEXT, -- 'purchase', 'bonus', 'redeem', 'referral'
  points INT,
  reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

---

## 5️⃣ 訂單系統擴展

### 擴展 orders 表

```sql
-- 添加會員相關欄位
ALTER TABLE orders ADD COLUMN IF NOT EXISTS (
  member_id UUID,
  order_source TEXT DEFAULT 'web', -- web, line_liff, in_store
  points_earned INT DEFAULT 0,
  points_redeemed INT DEFAULT 0,
  
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 例子：混合渠道訂單
INSERT INTO orders (
  customer_name, phone, email,
  order_source, member_id, -- 新增
  items, total_price, final_price,
  status, delivery_method, pickup_time
) VALUES (
  '張小美', '0912345678', 'zhang@email.com',
  'line_liff', 'member-id-123', -- LINE LIFF 來源
  '[...]', 1000, 950,
  'pending', 'pickup', '2026-02-21 14:00'
);
```

---

## 6️⃣ LINE LIFF + N8N 流程

### 🔄 自動化工作流

```
客戶行為：
1. LINE 掃 QR Code → 打開 LIFF
2. 選擇商品、填寫名字、電話
3. 點擊「提交訂單」

N8N 自動化流程：
Step 1: 接收 LIFF 表單數據
  ↓
Step 2: 檢查會員是否存在
  ├─ 存在 → 獲取會員 ID
  └─ 不存在 → 建立新會員
  ↓
Step 3: 將訂單寫入 Google Sheet
  (用作備份 + 手工確認)
  ↓
Step 4: 同步到月島系統 (API POST)
  ├─ 建立訂單
  ├─ 更新會員消費額
  └─ 計算積分
  ↓
Step 5: 發送確認訊息給客戶
  ├─ LINE 推播
  └─ SMS 簡訊
  ↓
Step 6: 後台通知
  ├─ Discord 訂單推播 (已有)
  └─ Email 給店員
```

### N8N 設定流程圖

```
┌─ Webhook 觸發
│  (接收 LINE LIFF 表單)
│
├─ HTTP 請求
│  └─ 查詢會員 API
│     (/api/members/check)
│
├─ 條件分支
│  ├─ 會員存在
│  │  └─ 獲取 member_id
│  └─ 會員不存在
│     └─ 建立新會員
│        └─ 獲取 member_id
│
├─ Google Sheet
│  └─ 追加一行 (訂單記錄)
│
├─ HTTP 請求
│  └─ 建立訂單 API
│     (/api/admin/orders)
│     {member_id, items, total_price}
│
├─ 計算積分
│  └─ HTTP 請求
│     (/api/members/{id}/add-points)
│     {points: total_price * rate}
│
├─ LINE 推播
│  └─ LINE Messaging API
│     訊息: "訂單已收到，#ORD-xxx"
│
└─ 完成
```

### 實例：Google Sheet 欄位

```
| 日期 | 姓名 | 電話 | 商品 | 金額 | 狀態 | 訂單號 | 會員ID |
|-----|------|------|------|------|------|--------|--------|
| 2/19 | 張小美 | 0912 | 巧克力蛋糕x1 | 580 | 未取 | ORD-001 | mem-123 |
| 2/19 | 李阿花 | 0913 | 起司挞x2 | 360 | 已取 | ORD-002 | mem-124 |
```

---

## 7️⃣ LINE LIFF 訂單表單 UI

### 簡單版本 (3天開發)

```
┌─────────────────────┐
│  月島甜點快速訂購   │
├─────────────────────┤
│ 👤 姓名 [________]  │
│ 📱 電話 [________]  │
│ 💌 Email [________] │
│                     │
│ 🛒 商品選擇        │
│ ☐ 巧克力蛋糕 $580  │
│ ☐ 起司挞 (6入) $300│
│ ☐ 生日蛋糕 (8吋) $1200│
│                     │
│ 數量 [1] ➕ ➖     │
│ 小計: $580          │
│                     │
│ 💳 取貨方式        │
│ ◉ 自取             │
│ ○ 外送             │
│                     │
│ 📅 取貨時間       │
│ [選擇日期] [14:00] │
│                     │
│ 📝 備註            │
│ [備註欄_______]    │
│                     │
│ ✅ 提交訂單  ❌取消 │
└─────────────────────┘
```

### 進階版本 (1週開發，加入遊戲化)

```
┌─────────────────────┐
│  🎮 月島甜點訂購    │
├─────────────────────┤
│ 👋 歡迎回來！       │
│ 💎 金卡會員         │
│ ⭐ 等級進度: 68%    │
│                     │
│ 👤 張小美           │
│ 📱 0912-345-678    │
│                     │
│ 🛒 商品選擇        │
│ ☐ 巧克力蛋糕 $580  │
│   💰 本次賺點: 696點│
│ ☐ 起司挞 $300      │
│   💰 本次賺點: 360點│
│                     │
│ 數量 [1] ➕ ➖     │
│ 小計: $580          │
│ 📊 總點數: 696      │
│                     │
│ 💳 取貨方式        │
│ ◉ 自取 (免運)      │
│ ○ 外送 (-100點)    │
│                     │
│ 📅 取貨時間       │
│ [選擇日期] [14:00] │
│                     │
│ 🎁 使用購物金      │
│ [ ] -$100 (-500點) │
│                     │
│ 📝 備註            │
│ [備註欄_______]    │
│                     │
│ ✅ 提交訂單  ❌取消 │
└─────────────────────┘
```

---

## 8️⃣ 實施時間表

### Week 1: 會員系統基礎
```
Day 1-2: 會員數據庫設計
  ├─ members 表
  ├─ member_points 表
  └─ member_badges 表

Day 3-4: 會員 API
  ├─ POST /api/members (新增)
  ├─ GET /api/members/{id} (查詢)
  ├─ POST /api/members/{id}/add-points (加積分)
  └─ PATCH /api/members/{id}/level-up (升級)

Day 5: 簡單前端 UI
  └─ 會員卡片顯示
```

### Week 2: 等級和徽章系統
```
Day 1: 等級晉升邏輯
  ├─ 消費額度計算
  ├─ 自動升級函數
  └─ 降級規則

Day 2-3: 徽章系統
  ├─ 徽章解鎖邏輯
  ├─ 徽章展示頁面
  └─ 進度提示

Day 4-5: 排行榜
  ├─ 月度排行
  ├─ 年度排行
  └─ 榜單 UI
```

### Week 3: 遊戲化 + N8N
```
Day 1-2: 簽到系統
  ├─ 每日簽到邏輯
  ├─ 連續簽到獎勵
  └─ 簽到 UI

Day 3: N8N 自動化
  ├─ Webhook 設定
  ├─ Google Sheet 同步
  └─ 積分自動計算

Day 4-5: LINE LIFF 整合
  ├─ LIFF 訂單表單
  ├─ 會員檢查 API
  └─ 自動建立訂單
```

### Week 4: 優化 + 部署
```
Day 1-2: 前端 UI 優化
  ├─ 遊戲化視覺設計
  ├─ 動畫效果
  └─ 積分視覺反饋

Day 3-4: 測試
  ├─ 單元測試
  ├─ E2E 測試
  └─ N8N 流程測試

Day 5: 上線部署
  ├─ Vercel 部署
  ├─ Google Sheet 連接
  └─ LINE LIFF 發佈
```

---

## ✅ 檢查清單

### 系統設計
- [ ] 確認四層分級規則 (消費額度)
- [ ] 定義積分計算公式
- [ ] 設計徽章條件
- [ ] 規劃排行榜種類

### 數據庫
- [ ] 建立 members 表
- [ ] 建立 member_points 表
- [ ] 建立 member_badges 表
- [ ] 建立 member_transactions 表
- [ ] 擴展 orders 表

### API 開發
- [ ] POST /api/members (新增會員)
- [ ] GET /api/members/{id} (查詢會員)
- [ ] POST /api/members/{id}/add-points (加積分)
- [ ] PATCH /api/members/{id}/level-up (升級)
- [ ] GET /api/leaderboards/monthly (月排行)

### 前端 UI
- [ ] 會員卡片頁面
- [ ] 等級進度條
- [ ] 徽章展示
- [ ] 排行榜頁面
- [ ] 簽到頁面

### N8N 自動化
- [ ] Google Sheet 連接
- [ ] 會員檢查邏輯
- [ ] 訂單同步流程
- [ ] 積分自動計算

### LINE LIFF
- [ ] LIFF 開發環境設定
- [ ] 訂單表單設計
- [ ] 會員檢查集成
- [ ] LINE 推播確認

### 部署
- [ ] 生產環境數據庫遷移
- [ ] Vercel 部署
- [ ] LINE LIFF 上線
- [ ] N8N 生產配置

---

## 🚀 實施優先級 (逐步推出)

### Phase 0: MVP 基礎會員系統 (1-2 週)
```
目標：先讓基本會員功能上線，再逐步添加遊戲化

做什麼：
✅ 會員註冊/登錄
✅ 消費積分計算 (基本 1元=1點)
✅ 每日簽到功能
✅ 會員等級顯示 (自動升級)
✅ 會員卡頁面 (展示積分、等級)

暫不做：
⏳ 複雜的任務系統
⏳ 排行榜
⏳ 大量徽章

好處：快速上線 → 收集使用者反饋 → 迭代改進
```

### Phase 1: 環保特性 + 邀請 (2-3 週)
```
做什麼：
✅ 載具綁定功能 (+100 點一次性)
✅ 電子發票加點 (+5 點/張)
✅ 邀請系統 (邀請碼、追蹤、獎勵)
✅ 推廣排行榜 (邀請王排名)

時間：Phase 0 完成後開始
```

### Phase 2: 遊戲化完整體驗 (3-4 週)
```
做什麼：
✅ 完整任務系統 (週/月任務)
✅ 徽章解鎖系統 (圖形化展示)
✅ 排行榜 (消費、邀請、簽到排行)
✅ 特殊活動任務 (節日挑戰等)

時間：Phase 1 完成後開始
```

### Phase 3: 社群互動 + 內容 (4-5 週)
```
做什麼：
✅ 評論評分系統 (+5 點/評論)
✅ 照片上傳功能 (+10 點/圖)
✅ SNS 分享追蹤 (+8 點/分享)
✅ Brand Ambassador 招募

時間：Phase 2 完成後開始
```

### Phase 4: 未來跨專案集成 (未定)
```
做什麼：
⏳ MBTI Lab 點數集成
⏳ 遊戲專案點數集成
⏳ Passport 統一中心
⏳ 多源點數兌換

時間：未來（當前專注月島甜點）
```

---

## 🎯 快速開始建議

### 第 1 步：建立 Supabase 遷移 (1小時)
需要的表：
- members (會員表)
- member_points (積分表)
- member_transactions (交易記錄)
- member_checkins (簽到記錄)

### 第 2 步：建立基礎 API (1-2天)
```
POST /api/members           (註冊)
GET /api/members/{id}       (查詢)
POST /api/members/{id}/points     (加積分)
POST /api/members/{id}/checkin    (簽到)
```

### 第 3 步：設計會員卡前端 (1-2天)
顯示內容：
- 等級卡片
- 積分進度條
- 年度消費

### 第 4 步：簽到頁面 (1天)
功能：一鍵簽到、日曆、連續獎勵

---

**你想從 Phase 0 MVP 開始還是完整版？** 🎮
