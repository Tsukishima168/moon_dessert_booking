import { Resend } from 'resend';
import { OrderItem } from './supabase';
import { createAdminClient } from './supabase-admin';

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
}): Promise<{ success: boolean }> {
  // 1. Discord 通知店家
  const msg = `🔄 訂單狀態更新: ${data.orderId}\n${data.customerName} 的訂單從 ${data.oldStatus} 變更為 **${data.newStatus}**`;
  sendDiscordNotify(msg);

  // 2. Email 通知客戶（只在 ready / cancelled 且有 email）
  if (!['ready', 'cancelled'].includes(data.newStatus) || !data.email) return { success: true };
  if (!resend) { console.warn('[Email] RESEND_API_KEY 未設定'); return { success: true }; }

  try {
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
    } else {
      const base = 'font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f5f0e8;padding:32px;';
      const accent = 'color:#c9a96e;font-weight:300;letter-spacing:0.3em;font-size:20px;margin:0 0 24px;';
      const footer = 'color:#c9a96e;font-size:11px;letter-spacing:0.2em;margin-top:32px;padding-top:16px;border-top:1px solid rgba(201,169,110,0.3);text-align:center;';
      if (data.newStatus === 'ready') {
        subject = '【月島甜點】您的訂單可以取貨了！';
        html = `<div style="${base}"><h1 style="${accent}">MOON MOON</h1><p>親愛的 ${data.customerName}，</p><p style="color:#c9a96e;">您的訂單現在可以取貨了！</p><p>訂單編號：${data.orderId}</p>${data.pickupTime ? `<p>取貨時間：${data.pickupTime}</p>` : ''}<p style="${footer}">月島甜點 · 台南安南區 · shop.kiwimu.com</p></div>`;
      } else {
        subject = '【月島甜點】訂單取消通知';
        html = `<div style="${base}"><h1 style="${accent}">MOON MOON</h1><p>親愛的 ${data.customerName}，</p><p>很抱歉通知您，您的訂單（${data.orderId}）已取消。</p><p>如有疑問歡迎與我們聯絡。</p><p style="${footer}">月島甜點 · 台南安南區 · shop.kiwimu.com</p></div>`;
      }
    }

    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    await resend.emails.send({ from, to: data.email, subject, html });
    console.log(`[Email] 狀態通知發送成功 → ${data.email} (${data.newStatus})`);
  } catch (err) {
    console.error('[Email] 狀態通知發送失敗（不影響狀態更新）:', err);
  }

  return { success: true };
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
