import { Resend } from 'resend';
import { OrderItem } from './supabase';
import { createAdminClient } from './supabase-admin';
import { sendEmail } from './email/resend';
import { orderReadyTemplate } from './email/templates/order-ready';
import { orderCancelledTemplate } from './email/templates/order-cancelled';

export type NotificationDeliveryState = 'sent' | 'failed' | 'skipped';

export interface NotificationDeliveryResult {
  channel: 'discord' | 'email';
  state: NotificationDeliveryState;
  message: string;
}

export interface OrderStatusNotificationResult {
  success: boolean;
  discord: NotificationDeliveryResult;
  email: NotificationDeliveryResult;
}

// 初始化 Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Discord Webhook 通知
export async function sendDiscordNotify(message: string, embed?: unknown): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) { console.warn('DISCORD_WEBHOOK_URL 未設定'); return false; }
  try {
    const payload: Record<string, unknown> = { content: message };
    if (embed) payload.embeds = [embed];
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Discord Webhook 失敗: ${response.status}`);
    console.log('Discord 通知發送成功');
    return true;
  } catch (error) { console.error('Discord Notify 錯誤:', error); return false; }
}

export async function sendLineNotify(message: string): Promise<boolean> {
  return sendDiscordNotify(message);
}

export async function sendCustomerEmail(data: {
  to: string; customerName: string; orderId: string; items: OrderItem[];
  totalPrice: number; pickupTime: string; promoCode?: string; discountAmount?: number;
  originalPrice?: number; paymentDate?: string; deliveryMethod?: 'pickup' | 'delivery';
  deliveryAddress?: string; deliveryFee?: number; deliveryNotes?: string;
}): Promise<boolean> {
  if (!resend) { console.warn('RESEND_API_KEY 未設定，跳過 Email 通知'); return false; }
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const storeName = process.env.STORE_NAME || 'MoonMoon Dessert';
  const bankAccount = process.env.BANK_ACCOUNT || '111007479473';
  const itemsList = data.items.map((item) => {
    const v = item.variant_name ? ` (${item.variant_name})` : '';
    return `  • ${item.name}${v} x${item.quantity} ($${item.price * item.quantity})`;
  }).join('\n');
  const emailHtml = `<h1>${storeName} 訂單確認</h1>
    <p>訂單編號: <b>${data.orderId}</b></p>
    <p>金額: <b style="color:blue;font-size:18px">$${data.totalPrice}</b></p>
    <hr/><h3>商品明細:</h3><pre>${itemsList}</pre><hr/>
    <p>取貨/配送時間: <b>${data.pickupTime}</b></p>
    ${data.deliveryMethod === 'delivery' ? `<p>配送地址: ${data.deliveryAddress}</p>` : '<p>取貨方式: 門市自取</p>'}
    <div style="background:#eee;padding:10px;margin-top:20px;">
      <h3>匯款資訊</h3><p>銀行代碼: 824 (連線銀行)</p>
      <p>帳號: <b>${bankAccount}</b></p>
      <p style="color:red">請於 24 小時內匯款並回傳末五碼</p>
    </div>
    <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px dashed #ccc;">
      <p>想隨時查詢訂單狀態？</p>
      <a href="https://shop.kiwimu.com/auth/login?email=${data.to}"
         style="background-color:#d4a574;color:black;padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;">
         啟用會員 / 查詢訂單
      </a>
    </div>`;
  try {
    await resend.emails.send({ from: fromEmail, to: data.to, subject: `【${storeName}】訂單確認 - ${data.orderId}`, html: emailHtml });
    console.log(`Email 發送成功: ${data.to}`);
    return true;
  } catch (error) { console.error('Email 發送錯誤:', error); return false; }
}

export async function notifyNewOrder(data: {
  orderId: string; customerName: string; phone: string; totalPrice: number;
  pickupTime: string; items: OrderItem[]; promoCode?: string; discountAmount?: number;
  originalPrice?: number; paymentDate?: string; deliveryMethod?: 'pickup' | 'delivery';
  deliveryAddress?: string; deliveryFee?: number; deliveryNotes?: string;
  orderSource?: string; utmSource?: string;
}): Promise<boolean> {
  const isDelivery = data.deliveryMethod === 'delivery';
  const sourceMap: Record<string, string> = { map: '月島地圖 🗺️', passport: '甜點護照 🎫', gacha: '扭蛋 🎰', direct: '直接訪問' };
  const sourceLabel = data.orderSource ? (sourceMap[data.orderSource] || data.orderSource) : '直接訪問';
  const embed = {
    title: '🔔 新訂單通知 (New Order)',
    description: `訂單編號: **${data.orderId}**\n來源：${sourceLabel}`,
    color: 0xd4a574,
    fields: [
      { name: '👤 客戶資訊', value: `${data.customerName}\n${data.phone}`, inline: true },
      { name: '💰 訂單金額', value: `$${data.totalPrice} ${data.promoCode ? `(已折抵 $${data.discountAmount})` : ''}`, inline: true },
      { name: '\u200b', value: '\u200b', inline: false },
      { name: isDelivery ? '🚚 配送資訊' : '🏪 自取資訊', value: isDelivery ? `地址: ${data.deliveryAddress}\n備註: ${data.deliveryNotes || '無'}` : '門市自取', inline: true },
      { name: '📅 時間', value: data.pickupTime, inline: true },
      { name: '\u200b', value: '\u200b', inline: false },
      { name: '訂購商品', value: data.items.map((i) => `• ${i.name} x${i.quantity}`).join('\n') },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `Moon Moon Dessert | ${data.utmSource || 'shop.kiwimu.com'}` },
  };
  return sendDiscordNotify('老闆，有新訂單來囉！🎉', embed);
}

// ── 訂單狀態變更通知（含 Email 給客戶）──────────────────────────
export async function sendOrderStatusNotification(data: {
  orderId: string; customerName: string; oldStatus: string; newStatus: string;
  email?: string; phone?: string; pickupTime?: string; deliveryMethod?: string;
  items?: OrderItem[];
}): Promise<OrderStatusNotificationResult> {
  // 1. Discord 通知店家
  const msg = `🔄 訂單狀態更新: ${data.orderId}\n${data.customerName} 的訂單從 ${data.oldStatus} 變更為 **${data.newStatus}**`;
  const discordConfigured = !!process.env.DISCORD_WEBHOOK_URL;
  const discord = discordConfigured
    ? await sendDiscordNotify(msg)
    : false;
  const discordResult: NotificationDeliveryResult = !discordConfigured
    ? {
      channel: 'discord',
      state: 'skipped',
      message: 'Discord Webhook 未設定，已略過店家通知',
    }
    : discord
      ? {
        channel: 'discord',
        state: 'sent',
        message: 'Discord 店家通知已送出',
      }
      : {
        channel: 'discord',
        state: 'failed',
        message: 'Discord 店家通知送出失敗，請查看 runtime logs',
      };

  // 2. Email 通知客戶（只在 ready / cancelled 且有 email）
  if (!['ready', 'cancelled'].includes(data.newStatus)) {
    return {
      success: discordResult.state !== 'failed',
      discord: discordResult,
      email: {
        channel: 'email',
        state: 'skipped',
        message: '此狀態不寄送客戶 Email',
      },
    };
  }

  if (!data.email) {
    return {
      success: discordResult.state !== 'failed',
      discord: discordResult,
      email: {
        channel: 'email',
        state: 'skipped',
        message: '此訂單沒有 Email，已略過客戶通知',
      },
    };
  }

  try {
    // 優先查 DB email_templates（後台可自訂模板）
    const db = createAdminClient();
    const keyword = data.newStatus === 'ready' ? '取貨' : '取消';
    const { data: rows } = await db
      .from('email_templates')
      .select('subject, html_content')
      .eq('is_active', true)
      .ilike('name', `%${keyword}%`)
      .limit(1);

    const tpl = rows?.[0] as { subject: string; html_content: string } | undefined;
    let subject: string;
    let html: string;

    if (tpl) {
      subject = tpl.subject;
      html = tpl.html_content
        .replace(/\{customer_name\}/g, data.customerName)
        .replace(/\{order_id\}/g, data.orderId)
        .replace(/\{pickup_time\}/g, data.pickupTime ?? '');
    } else if (data.newStatus === 'ready') {
      ({ subject, html } = orderReadyTemplate({
        customerName: data.customerName,
        orderNumber: data.orderId,
        pickupTime: data.pickupTime ?? '',
        items: data.items ?? [],
      }));
    } else {
      ({ subject, html } = orderCancelledTemplate({
        customerName: data.customerName,
        orderNumber: data.orderId,
      }));
    }

    const emailSent = await sendEmail(data.email, subject, html);
    if (emailSent) {
      console.log(`[Email] 狀態通知發送成功 → ${data.email} (${data.newStatus})`);
      return {
        success: discordResult.state !== 'failed',
        discord: discordResult,
        email: {
          channel: 'email',
          state: 'sent',
          message: `客戶 Email 已寄至 ${data.email}`,
        },
      };
    }

    return {
      success: false,
      discord: discordResult,
      email: {
        channel: 'email',
        state: 'failed',
        message: `客戶 Email 寄送失敗（${data.email}）`,
      },
    };
  } catch (err) {
    console.error('[Email] 狀態通知發送失敗（不影響狀態更新）:', err);
    return {
      success: false,
      discord: discordResult,
      email: {
        channel: 'email',
        state: 'failed',
        message: `客戶 Email 寄送失敗（${data.email}）`,
      },
    };
  }
}

export async function sendPickupReminderEmail(_data: unknown): Promise<boolean> {
  return false;
}

export async function sendPickupReminderLineNotify(data: {
  orderId: string; customerName: string; phone?: string; pickupTime: string;
  items: { name: string; quantity: number }[]; deliveryMethod?: string;
}): Promise<boolean> {
  const itemsList = (data.items || []).map((i) => `• ${i.name} x${i.quantity}`).join('\n');
  const message = `📦 明日取貨提醒\n訂單: ${data.orderId}\n客戶: ${data.customerName}\n電話: ${data.phone || '-'}\n時間: ${data.pickupTime}\n\n${itemsList}`;
  return sendDiscordNotify(message);
}
