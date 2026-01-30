-- 新增「預計轉帳日期」欄位到訂單資料表

ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS payment_date TEXT;

-- 為新欄位建立索引，方便查詢
CREATE INDEX IF NOT EXISTS idx_orders_payment_date ON orders(payment_date);

-- 查詢今天預計轉帳的訂單
CREATE OR REPLACE VIEW today_pending_payments AS
SELECT 
  order_id,
  customer_name,
  phone,
  total_price,
  payment_date,
  created_at
FROM orders
WHERE payment_date = CURRENT_DATE::TEXT
  AND status = 'pending'
ORDER BY created_at;

-- 查詢逾期未轉帳的訂單
CREATE OR REPLACE VIEW overdue_payments AS
SELECT 
  order_id,
  customer_name,
  phone,
  total_price,
  payment_date,
  created_at,
  CURRENT_DATE::TEXT::DATE - payment_date::DATE as days_overdue
FROM orders
WHERE payment_date < CURRENT_DATE::TEXT
  AND status = 'pending'
ORDER BY payment_date;

-- 完成！
-- 現在可以追蹤客戶的預計轉帳日期了
