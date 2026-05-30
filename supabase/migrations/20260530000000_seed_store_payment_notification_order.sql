-- 鞏固式補全：補上店家資訊 / 付款匯款 / 通知開關 / 訂單規則 預設設定
-- 比照 20260130_create_business_settings.sql 的 key-value(JSONB) 風格
-- ON CONFLICT DO NOTHING：不覆蓋既有值，可安全重跑

INSERT INTO business_settings (setting_key, setting_value, description) VALUES
  (
    'store_info',
    '{
      "name": "MoonMoon Dessert",
      "phone": "",
      "line_id": "",
      "email": "",
      "address": ""
    }'::jsonb,
    '店家資訊: 店名、電話、LINE ID、客服 Email、地址'
  ),
  (
    'payment_settings',
    '{
      "bank_name": "連線銀行",
      "bank_code": "824",
      "bank_branch": "",
      "bank_account": "111007479473",
      "account_holder": "",
      "methods": { "bank_transfer": true, "line_pay": true }
    }'::jsonb,
    '付款與匯款: 銀行帳戶資訊、啟用的付款方式 (轉帳 / LINE Pay)。預設值沿用 notifications.ts 既有寫死值'
  ),
  (
    'order_rules',
    '{
      "minimum_order_amount": 0,
      "order_notes_enabled": true,
      "require_phone": true
    }'::jsonb,
    '訂單規則: 最低消費金額、是否開放訂單備註、是否必填電話'
  ),
  (
    'notification_settings',
    '{
      "order_created": { "discord": true },
      "order_status": { "discord": true, "email": true },
      "pickup_reminder": { "discord": true }
    }'::jsonb,
    '通知開關: 各事件對應的通知通道 (Discord / Email)'
  )
ON CONFLICT (setting_key) DO NOTHING;
