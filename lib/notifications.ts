import { Resend } from 'resend';
import { OrderItem } from './supabase';

// 初始化 Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// LINE Notify 通知
export async function sendLineNotify(message: string): Promise<boolean> {
  const token = process.env.LINE_NOTIFY_TOKEN;

  if (!token) {
    console.warn('LINE_NOTIFY_TOKEN 未設定，跳過 LINE 通知');
    return false;
  }

  try {
    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `message=${encodeURIComponent(message)}`,
    });

    if (!response.ok) {
      throw new Error(`LINE Notify 失敗: ${response.status}`);
    }

    console.log('LINE 通知發送成功');
    return true;
  } catch (error) {
    console.error('LINE Notify 錯誤:', error);
    return false;
  }
}

// Email 通知給客戶
export async function sendCustomerEmail(data: {
  to: string;
  customerName: string;
  orderId: string;
  items: OrderItem[];
  totalPrice: number;
  pickupTime: string;
  promoCode?: string;
  discountAmount?: number;
  originalPrice?: number;
  paymentDate?: string;
  deliveryMethod?: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryFee?: number;
  deliveryNotes?: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY 未設定，跳過 Email 通知');
    return false;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'orders@example.com';
  const storeName = process.env.STORE_NAME || 'MoonMoon Dessert';
  const bankName = process.env.BANK_NAME || '連線商業銀行';
  const bankCode = process.env.BANK_CODE || '824';
  const bankBranch = process.env.BANK_BRANCH || '總行 6880';
  const bankAccount = process.env.BANK_ACCOUNT || '111007479473';
  const accountHolder = process.env.ACCOUNT_HOLDER || storeName;
  const storePhone = process.env.STORE_PHONE || '';
  const storeLineId = process.env.STORE_LINE_ID || '';

  const itemsList = data.items
    .map((item) => {
      const variantText = item.variant_name ? ` (${item.variant_name})` : '';
      return `  • ${item.name}${variantText} x${item.quantity} ($${item.price * item.quantity})`;
    })
    .join('\n');

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: #0a0a0a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <img src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png" alt="月島甜點" style="height: 40px; margin: 0 auto 15px;" />
        <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; letter-spacing: 2px;">訂單確認</p>
      </div>
      
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #374151;">親愛的 <strong>${data.customerName}</strong> 您好：</p>
        
        <p style="color: #6b7280;">感謝您的訂購！以下是您的訂單資訊：</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0; color: #374151;"><strong>📋 訂單編號：</strong>${data.orderId}</p>
          ${data.promoCode && data.discountAmount ? `
          <p style="margin: 5px 0; color: #374151;"><strong>🎫 優惠碼：</strong>${data.promoCode} (-$${data.discountAmount})</p>
          <p style="margin: 5px 0; color: #9ca3af; text-decoration: line-through;"><strong>原價：</strong>$${data.originalPrice}</p>
          ` : ''}
          <p style="margin: 5px 0; color: #374151;"><strong>💰 訂單金額：</strong><span style="font-size: 18px; color: #1e3a8a;">$${data.totalPrice}</span></p>
          ${data.deliveryMethod === 'delivery' ? `
          <p style="margin: 5px 0; color: #374151;"><strong>🚚 取貨方式：</strong>宅配</p>
          <p style="margin: 5px 0; color: #374151;"><strong>📍 收件地址：</strong>${data.deliveryAddress || ''}</p>
          ${data.deliveryFee && data.deliveryFee > 0 ? `
          <p style="margin: 5px 0; color: #374151;"><strong>運費：</strong>$${data.deliveryFee}</p>
          ` : ''}
          ${data.deliveryNotes ? `
          <p style="margin: 5px 0; color: #374151;"><strong>備註：</strong>${data.deliveryNotes}</p>
          ` : ''}
          <p style="margin: 5px 0; color: #374151;"><strong>📅 預計出貨：</strong>${data.pickupTime}</p>
          ` : `
          <p style="margin: 5px 0; color: #374151;"><strong>🏪 取貨方式：</strong>門市自取</p>
          <p style="margin: 5px 0; color: #374151;"><strong>🕐 取貨時間：</strong>${data.pickupTime}</p>
          `}
          ${data.paymentDate ? `
          <p style="margin: 5px 0; color: #374151;"><strong>📅 預計轉帳：</strong>${data.paymentDate}</p>
          ` : ''}
        </div>
        
        <h3 style="color: #1e3a8a; border-bottom: 2px solid #fbbf24; padding-bottom: 10px;">📦 訂購商品</h3>
        <pre style="font-family: Arial, sans-serif; line-height: 1.8; color: #374151; background-color: #f9fafb; padding: 15px; border-radius: 5px;">${itemsList}</pre>
        
        <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #dc2626; margin-top: 0;">💳 匯款資訊</h3>
          <p style="margin: 5px 0; color: #374151;"><strong>銀行名稱：</strong>${bankName}</p>
          <p style="margin: 5px 0; color: #374151;"><strong>銀行代碼：</strong>${bankCode}</p>
          <p style="margin: 5px 0; color: #374151;"><strong>分行：</strong>${bankBranch}</p>
          <p style="margin: 5px 0; color: #374151;"><strong>帳號：</strong><span style="font-size: 18px; font-weight: bold; color: #dc2626;">${bankAccount}</span></p>
          <p style="margin: 5px 0; color: #374151;"><strong>戶名：</strong>${accountHolder}</p>
          
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fca5a5;">
            <p style="color: #dc2626; font-weight: bold; margin: 5px 0;">⚠️ 請於 24 小時內完成匯款</p>
            <p style="color: #374151; margin: 5px 0;">⚠️ 匯款後請截圖傳送到我們的 LINE</p>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px;">
          <h3 style="color: #1e3a8a; margin-top: 0;">📞 聯絡我們</h3>
          ${storePhone ? `<p style="margin: 5px 0; color: #374151;">電話：${storePhone}</p>` : ''}
          ${storeLineId ? `<p style="margin: 5px 0; color: #374151;">LINE ID：${storeLineId}</p>` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
          <img src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768736617/mbti_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F_1_zpt5jq.webp" alt="Kiwimu" style="height: 60px; margin: 0 auto 15px; opacity: 0.7;" />
          <p style="color: #9ca3af; font-size: 14px; margin: 10px 0;">
            有任何問題歡迎隨時聯絡我們
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px;">
        <img src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png" alt="月島甜點" style="height: 30px; margin: 0 auto 10px; opacity: 0.5;" />
        <p style="color: #9ca3af; font-size: 12px;">© 2024 ${storeName}. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: `【${storeName}】訂單確認 - ${data.orderId}`,
      html: emailHtml,
    });

    console.log(`Email 發送成功: ${data.to}`);
    return true;
  } catch (error) {
    console.error('Email 發送錯誤:', error);
    return false;
  }
}

// LINE 通知店家有新訂單
export async function notifyNewOrder(data: {
  orderId: string;
  customerName: string;
  phone: string;
  totalPrice: number;
  pickupTime: string;
  items: OrderItem[];
  promoCode?: string;
  discountAmount?: number;
  originalPrice?: number;
  paymentDate?: string;
  deliveryMethod?: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryFee?: number;
  deliveryNotes?: string;
}): Promise<boolean> {
  const itemsList = data.items
    .map((item) => {
      const variantText = item.variant_name ? ` (${item.variant_name})` : '';
      return `  • ${item.name}${variantText} x${item.quantity}`;
    })
    .join('\n');

  const promoText = data.promoCode && data.discountAmount
    ? `\n🎫 優惠碼：${data.promoCode} (-$${data.discountAmount})\n💵 原價：$${data.originalPrice}`
    : '';

  const paymentText = data.paymentDate
    ? `\n📅 預計轉帳：${data.paymentDate}`
    : '';

  const deliveryText = data.deliveryMethod === 'delivery'
    ? `\n🚚 取貨方式：宅配\n📍 收件地址：${data.deliveryAddress || ''}${data.deliveryFee && data.deliveryFee > 0 ? `\n💰 運費：$${data.deliveryFee}` : '\n💰 運費：免運'}${data.deliveryNotes ? `\n📝 備註：${data.deliveryNotes}` : ''}\n📅 預計出貨：${data.pickupTime}`
    : `\n🏪 取貨方式：門市自取\n🕐 取貨時間：${data.pickupTime}`;

  const message = `
🌙 月島甜點 - 新訂單通知

訂單編號：${data.orderId}
客戶姓名：${data.customerName}
聯絡電話：${data.phone}${promoText}
💰 訂購金額：$${data.totalPrice}${paymentText}${deliveryText}

商品明細：
${itemsList}

請準備商品！
  `.trim();

  return await sendLineNotify(message);
}

// ==========================================
// 取貨提醒通知
// ==========================================

// Email 取貨提醒
export async function sendPickupReminderEmail(data: {
  to: string;
  customerName: string;
  orderId: string;
  items: OrderItem[];
  totalPrice: number;
  pickupTime: string;
  deliveryMethod?: 'pickup' | 'delivery';
  deliveryAddress?: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn('RESEND_API_KEY 未設定，跳過 Email 提醒');
    return false;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'orders@example.com';
  const storeName = process.env.STORE_NAME || 'MoonMoon Dessert';
  const storePhone = process.env.STORE_PHONE || '';
  const storeLineId = process.env.STORE_LINE_ID || '';

  const itemsList = data.items
    .map((item) => {
      const variantText = item.variant_name ? ` (${item.variant_name})` : '';
      return `<li style="margin: 5px 0;">${item.name}${variantText} x${item.quantity}</li>`;
    })
    .join('');

  const isDelivery = data.deliveryMethod === 'delivery';
  const actionText = isDelivery ? '出貨' : '取貨';

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: #0a0a0a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <img src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png" alt="月島甜點" style="height: 40px; margin: 0 auto 15px;" />
        <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; letter-spacing: 2px;">🔔 ${actionText}提醒</p>
      </div>
      
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #374151;">親愛的 <strong>${data.customerName}</strong> 您好：</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="font-size: 18px; color: #92400e; margin: 0;">
            🎂 您的訂單預計於 <strong>明天</strong> ${actionText}！
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0; color: #374151;"><strong>📋 訂單編號：</strong>${data.orderId}</p>
          <p style="margin: 5px 0; color: #374151;"><strong>📅 ${actionText}日期：</strong>${data.pickupTime}</p>
          ${isDelivery && data.deliveryAddress ? `<p style="margin: 5px 0; color: #374151;"><strong>📍 收件地址：</strong>${data.deliveryAddress}</p>` : ''}
          <p style="margin: 5px 0; color: #374151;"><strong>💰 訂單金額：</strong>$${data.totalPrice}</p>
        </div>
        
        <h3 style="color: #1e3a8a; border-bottom: 2px solid #fbbf24; padding-bottom: 10px;">📦 訂購商品</h3>
        <ul style="color: #374151; line-height: 1.8;">${itemsList}</ul>
        
        ${!isDelivery ? `
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="color: #1e40af; margin: 0;">
            💡 <strong>溫馨提醒</strong>：請於取貨日期攜帶此信或訂單編號至門市取貨
          </p>
        </div>
        ` : ''}
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px;">
          <h3 style="color: #1e3a8a; margin-top: 0;">📞 聯絡我們</h3>
          ${storePhone ? `<p style="margin: 5px 0; color: #374151;">電話：${storePhone}</p>` : ''}
          ${storeLineId ? `<p style="margin: 5px 0; color: #374151;">LINE ID：${storeLineId}</p>` : ''}
          <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">如需更改時間請提前聯繫我們</p>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px;">感謝您的訂購，期待為您服務！💛</p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px;">
        <img src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png" alt="月島甜點" style="height: 30px; margin: 0 auto 10px; opacity: 0.5;" />
        <p style="color: #9ca3af; font-size: 12px;">© 2024 ${storeName}. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: data.to,
      subject: `【${storeName}】🔔 明天${actionText}提醒 - ${data.orderId}`,
      html: emailHtml,
    });

    console.log(`取貨提醒 Email 發送成功: ${data.to}`);
    return true;
  } catch (error) {
    console.error('取貨提醒 Email 發送錯誤:', error);
    return false;
  }
}

// LINE 取貨提醒（發送給客戶 - 需要 LINE OA 整合）
// 目前使用 LINE Notify 通知店家，由店家轉發
export async function sendPickupReminderLineNotify(data: {
  orderId: string;
  customerName: string;
  phone: string;
  pickupTime: string;
  items: OrderItem[];
  deliveryMethod?: 'pickup' | 'delivery';
}): Promise<boolean> {
  const itemsList = data.items
    .map((item) => {
      const variantText = item.variant_name ? ` (${item.variant_name})` : '';
      return `  • ${item.name}${variantText} x${item.quantity}`;
    })
    .join('\n');

  const isDelivery = data.deliveryMethod === 'delivery';
  const actionText = isDelivery ? '出貨' : '取貨';

  const message = `
🔔 明日${actionText}提醒

訂單編號：${data.orderId}
客戶姓名：${data.customerName}
聯絡電話：${data.phone}
${actionText}日期：${data.pickupTime}

商品明細：
${itemsList}

請準備商品，並視需要聯繫客戶確認！
  `.trim();

  return await sendLineNotify(message);
}

// 訂單狀態配置（中文名稱和 emoji）
const STATUS_CONFIG: Record<string, { label: string; emoji: string; customerMessage: string }> = {
  pending: {
    label: '待付款',
    emoji: '⏳',
    customerMessage: '您的訂單已建立，請完成付款。',
  },
  paid: {
    label: '已付款',
    emoji: '✅',
    customerMessage: '付款已確認！我們將開始準備您的甜點。',
  },
  preparing: {
    label: '製作中',
    emoji: '🍰',
    customerMessage: '您的甜點正在用心製作中，請耐心等候。',
  },
  ready: {
    label: '可取貨',
    emoji: '📦',
    customerMessage: '您的甜點已準備完成，歡迎前來取貨！',
  },
  completed: {
    label: '已完成',
    emoji: '🎉',
    customerMessage: '感謝您的購買！期待下次再見～',
  },
  cancelled: {
    label: '已取消',
    emoji: '❌',
    customerMessage: '您的訂單已取消。如有疑問請聯繫我們。',
  },
};

// 發送訂單狀態變更通知
export async function sendOrderStatusNotification(data: {
  orderId: string;
  customerName: string;
  phone: string;
  email?: string;
  oldStatus: string;
  newStatus: string;
  pickupTime: string;
  deliveryMethod?: 'pickup' | 'delivery';
}): Promise<{ lineNotified: boolean; emailSent: boolean }> {
  const newStatusConfig = STATUS_CONFIG[data.newStatus] || STATUS_CONFIG.pending;
  const isDelivery = data.deliveryMethod === 'delivery';
  const actionText = isDelivery ? '出貨' : '取貨';

  const results = { lineNotified: false, emailSent: false };

  // 1. 發送 LINE 通知給店家（記錄狀態變更）
  const lineMessage = `
${newStatusConfig.emoji} 訂單狀態更新

訂單編號：${data.orderId}
客戶姓名：${data.customerName}
新狀態：${newStatusConfig.label}
${actionText}時間：${data.pickupTime}
  `.trim();

  results.lineNotified = await sendLineNotify(lineMessage);

  // 2. 發送 Email 給客戶（如有提供 email）
  if (data.email && resend) {
    const storeName = process.env.STORE_NAME || '月島甜點';
    const storePhone = process.env.STORE_PHONE || '';
    const storeLineId = process.env.STORE_LINE_ID || '';

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
        to: data.email,
        subject: `${newStatusConfig.emoji} ${storeName} - 訂單狀態更新`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #1a1a1a; color: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #d4a574; font-weight: 300; letter-spacing: 2px; margin: 0;">
                ${storeName}
              </h1>
            </div>
            
            <div style="background-color: #2a2a2a; border: 1px solid #3a3a3a; padding: 32px; margin-bottom: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">${newStatusConfig.emoji}</span>
                <h2 style="color: #d4a574; font-weight: 300; margin: 16px 0 8px;">
                  訂單狀態：${newStatusConfig.label}
                </h2>
              </div>
              
              <p style="color: #cccccc; text-align: center; font-size: 14px; line-height: 1.6;">
                ${data.customerName} 您好，<br>
                ${newStatusConfig.customerMessage}
              </p>
              
              <div style="border-top: 1px solid #3a3a3a; margin: 24px 0; padding-top: 24px;">
                <table style="width: 100%; font-size: 14px; color: #999999;">
                  <tr>
                    <td style="padding: 8px 0;">訂單編號</td>
                    <td style="padding: 8px 0; text-align: right; color: #d4a574; font-family: monospace;">
                      ${data.orderId}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">${actionText}時間</td>
                    <td style="padding: 8px 0; text-align: right; color: #ffffff;">
                      ${data.pickupTime}
                    </td>
                  </tr>
                </table>
              </div>
            </div>
            
            <div style="text-align: center; font-size: 12px; color: #666666;">
              <p>如有任何問題，歡迎聯繫我們</p>
              ${storePhone ? `<p>電話：${storePhone}</p>` : ''}
              ${storeLineId ? `<p>LINE ID：${storeLineId}</p>` : ''}
            </div>
          </div>
        `,
      });

      results.emailSent = true;
      console.log(`狀態更新 Email 已發送至 ${data.email}`);
    } catch (error) {
      console.error('發送狀態更新 Email 錯誤:', error);
    }
  }

  return results;
}


