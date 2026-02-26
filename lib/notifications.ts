import { Resend } from 'resend';
import { OrderItem } from './supabase';

// 初始化 Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Discord Webhook 通知
export async function sendDiscordNotify(message: string, embed?: any): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL 未設定，跳過 Discord 通知');
    return false;
  }

  try {
    const payload: any = {
      content: message,
    };

    if (embed) {
      payload.embeds = [embed];
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord Webhook 失敗: ${response.status}`);
    }

    console.log('Discord 通知發送成功');
    return true;
  } catch (error) {
    console.error('Discord Notify 錯誤:', error);
    return false;
  }
}

// 保留舊的 LINE Notify (為了向後相容，但實作改為空或 console log)
// 如果用戶還想用，可以改回 fetch，但已知 LINE Notify 要停了
export async function sendLineNotify(message: string): Promise<boolean> {
  // 暫時轉發到 Discord
  return sendDiscordNotify(message);
}

// Email 通知給客戶 (維持不變)
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

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const storeName = process.env.STORE_NAME || 'MoonMoon Dessert';
  const bankAccount = process.env.BANK_ACCOUNT || '111007479473';
  const storePhone = process.env.STORE_PHONE || '';
  const storeLineId = process.env.STORE_LINE_ID || '';

  const itemsList = data.items
    .map((item) => {
      const variantText = item.variant_name ? ` (${item.variant_name})` : '';
      return `  • ${item.name}${variantText} x${item.quantity} ($${item.price * item.quantity})`;
    })
    .join('\n');

  // 簡化的 HTML 範本 (避免太長)
  const emailHtml = `
    <h1>${storeName} 訂單確認</h1>
    <p>訂單編號: <b>${data.orderId}</b></p>
    <p>金額: <b style="color:blue; font-size:18px">$${data.totalPrice}</b></p>
    <hr/>
    <h3>商品明細:</h3>
    <pre>${itemsList}</pre>
    <hr/>
    <p>取貨/配送時間: <b>${data.pickupTime}</b></p>
    ${data.deliveryMethod === 'delivery' ? `<p>配送地址: ${data.deliveryAddress}</p>` : '<p>取貨方式: 門市自取</p>'}
    
    <div style="background:#eee; padding:10px; margin-top:20px;">
       <h3>匯款資訊</h3>
       <p>銀行代碼: 824 (連線銀行)</p>
       <p>帳號: <b>${bankAccount}</b></p>
       <p style="color:red">請於 24 小時內匯款並回傳末五碼</p>
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ccc;">
      <p>想隨時查詢訂單狀態？</p>
      <a href="https://shop.kiwimu.com/auth/login?email=${data.to}"
         style="background-color: #d4a574; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
         啟用會員 / 查詢訂單
      </a>
      <p style="font-size: 12px; color: #666; margin-top: 10px;">點擊上方按鈕，使用此 Email 登入即可自動連結您的訂單記錄。</p>
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

// 通知店家有新訂單 (改用 Discord Embed)
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
  orderSource?: string; // 來源子站：map / passport / gacha / direct
  utmSource?: string;
}): Promise<boolean> {

  // 準備 Embed 欄位
  const itemFields = data.items.map(item => ({
    name: item.name + (item.variant_name ? ` (${item.variant_name})` : ''),
    value: `x${item.quantity} ($${item.price})`,
    inline: true
  }));

  const isDelivery = data.deliveryMethod === 'delivery';

  // 來源標籤
  const sourceLabel = data.orderSource
    ? { map: '月島地圖 🗺️', passport: '甜點護照 🎫', gacha: '扭蛋 🎰', direct: '直接訪問' }[data.orderSource] || data.orderSource
    : '直接訪問';

  // 建立 Discord Embed
  const embed = {
    title: "🔔 新訂單通知 (New Order)",
    description: `訂單編號: **${data.orderId}**\n來源：${sourceLabel}`,
    color: 0xd4a574, // Moon Accent Color (#d4a574)
    fields: [
      {
        name: "👤 客戶資訊",
        value: `${data.customerName}\n${data.phone}`,
        inline: true
      },
      {
        name: "💰 訂單金額",
        value: `$${data.totalPrice} ${data.promoCode ? `(已折抵 $${data.discountAmount})` : ''}`,
        inline: true
      },
      { name: "\u200b", value: "\u200b", inline: false }, // Spacer
      {
        name: isDelivery ? "🚚 配送資訊" : "🏪 自取資訊",
        value: isDelivery
          ? `地址: ${data.deliveryAddress}\n備註: ${data.deliveryNotes || '無'}`
          : `門市自取`,
        inline: true
      },
      {
        name: "📅 時間",
        value: data.pickupTime,
        inline: true
      },
      { name: "\u200b", value: "\u200b", inline: false }, // Spacer
      {
        name: "訂購商品",
        value: data.items.map(i => `• ${i.name} x${i.quantity}`).join('\n')
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: `Moon Moon Dessert | ${data.utmSource || 'shop.kiwimu.com'}`
    }
  };

  return await sendDiscordNotify("老闆，有新訂單來囉！🎉", embed);
}

// 發送訂單狀態變更通知
export async function sendOrderStatusNotification(data: {
  orderId: string;
  customerName: string;
  oldStatus: string;
  newStatus: string;
  email?: string;
  phone?: string;
  pickupTime?: string;
  deliveryMethod?: string;
}): Promise<any> {
  // 簡單版：只發 Discord 通知給店家
  const message = `🔄 訂單狀態更新: ${data.orderId}\n${data.customerName} 的訂單從 ${data.oldStatus} 變更為 **${data.newStatus}**`;
  sendDiscordNotify(message);

  // 如果要發 Email 給客人在這裡加 (略)
  return { success: true };
}

// 取貨提醒 Email (略，暫時不實作)
export async function sendPickupReminderEmail(data: any): Promise<boolean> {
  return false;
}

// 取貨提醒 → Discord（取代 LINE Notify）
export async function sendPickupReminderLineNotify(data: {
  orderId: string;
  customerName: string;
  phone?: string;
  pickupTime: string;
  items: any[];
  deliveryMethod?: string;
}): Promise<boolean> {
  const itemsList = (data.items || []).map((i: any) => `• ${i.name} x${i.quantity}`).join('\n');
  const message = `📦 明日取貨提醒\n訂單: ${data.orderId}\n客戶: ${data.customerName}\n電話: ${data.phone || '-'}\n時間: ${data.pickupTime}\n\n${itemsList}`;
  return sendDiscordNotify(message);
}
