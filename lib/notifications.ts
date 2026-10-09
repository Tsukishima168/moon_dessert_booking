import { OrderItem } from './supabase';
import { createAdminClient } from './supabase-admin';
import { sendEmail } from './email/resend';
import { escapeEmailText, renderEmailTextTemplate } from './email/html';
import { orderReadyTemplate } from './email/templates/order-ready';
import { orderCancelledTemplate } from './email/templates/order-cancelled';
import { fetchBusinessSettings } from '@/src/repositories/settings.repository';
import {
  getStoreInfo,
  getPaymentSettings,
  getNotificationSettings,
} from '@/src/services/settings.service';

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

export type StatusNotificationChannel = 'discord' | 'email';

// Discord 通知設定
// 與 map / menu 共用「Kiwimu宇宙 → #月島訂單通知」頻道：
//   優先用 Bot Token（DISCORD_TOKEN）直接發到該頻道（與 map 相同機制），
//   無 token 時 fallback 用 Webhook。每則訊息都加來源標籤，方便在共用頻道區分 shop 與 map/menu。
const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_ORDER_CHANNEL_ID =
  process.env.DISCORD_ORDER_CHANNEL_ID || '1467024414699819152'; // #月島訂單通知
const DISCORD_SOURCE_LABEL =
  process.env.DISCORD_SOURCE_LABEL || '線上商店 shop.kiwimu.com';

export function isDiscordConfigured(): boolean {
  return !!(process.env.DISCORD_TOKEN || process.env.DISCORD_WEBHOOK_URL);
}

export async function sendDiscordNotify(message: string, embed?: unknown): Promise<boolean> {
  const botToken = process.env.DISCORD_TOKEN;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!botToken && !webhookUrl) {
    console.warn('Discord 未設定（DISCORD_TOKEN / DISCORD_WEBHOOK_URL 皆空），略過通知');
    return false;
  }

  // 來源標籤：在共用頻道中標明這則訊息來自 shop
  // allowed_mentions.parse=[]：訊息內含顧客姓名等使用者輸入，一律不解析任何提及
  //（@everyone / @here / 角色 / 使用者），bot 與 webhook 兩條路徑共用此 payload。
  const payload: Record<string, unknown> = {
    content: `〔🛍️ ${DISCORD_SOURCE_LABEL}〕\n${message}`,
    allowed_mentions: { parse: [] },
  };
  if (embed) payload.embeds = [embed];

  let url: string;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (botToken) {
    // 與 map/menu 相同：用同一個 bot 發到同一個頻道
    url = `${DISCORD_API}/channels/${DISCORD_ORDER_CHANNEL_ID}/messages`;
    headers.Authorization = `Bot ${botToken}`;
  } else {
    // Fallback：Webhook 可直接用顯示名稱標注來源
    url = webhookUrl as string;
    payload.username = `月島・${DISCORD_SOURCE_LABEL}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Discord 發送失敗: ${response.status} ${detail}`.trim());
    }
    console.log(`Discord 通知發送成功（${botToken ? 'bot→channel' : 'webhook'}）`);
    return true;
  } catch (error) {
    console.error('Discord Notify 錯誤:', error);
    return false;
  }
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
  // 店名 / 匯款資訊改讀業務設定（service 預設已鏡像原 env fallback，行為不變）
  const settingsMap = await fetchBusinessSettings().catch(() => ({}));
  const store = await getStoreInfo(settingsMap);
  const payment = await getPaymentSettings(settingsMap);
  const storeName = store.name;
  const bankAccount = payment.bank_account;
  const bankLabel = payment.bank_name
    ? `${payment.bank_code} (${payment.bank_name})`
    : payment.bank_code;
  const itemsList = data.items.map((item) => {
    const v = item.variant_name ? ` (${item.variant_name})` : '';
    return `  • ${item.name}${v} x${item.quantity} ($${item.price * item.quantity})`;
  }).join('\n');
  const emailHtml = `<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;color:#1f2f1f;">
  <div style="font-family:'Noto Sans TC',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;line-height:1.8;">
    <h1 style="margin:0 0 24px;font-size:24px;color:#1f3527;">${escapeEmailText(storeName)} 訂單確認</h1>
    <p>我們已收到您的預訂，請核對以下內容。</p>
    <div style="background:#fffdf8;border:1px solid #d8d7c4;border-radius:12px;padding:20px;">
      <p>訂單編號：<b>${escapeEmailText(data.orderId)}</b></p>
      <p>金額：<b style="color:#795b23;font-size:20px;">NT$ ${escapeEmailText(data.totalPrice)}</b></p>
      <h2 style="font-size:16px;">商品明細</h2>
      <pre style="font-family:inherit;white-space:pre-wrap;font-size:14px;">${escapeEmailText(itemsList)}</pre>
      <p>取貨／配送時間：<b>${escapeEmailText(data.pickupTime)}</b></p>
      ${data.deliveryMethod === 'delivery' ? `<p>配送地址：${escapeEmailText(data.deliveryAddress)}</p>` : '<p>取貨方式：門市自取</p>'}
    </div>
    <div style="background:#fffdf8;border:1px solid #d8d7c4;border-radius:12px;padding:20px;margin-top:20px;">
      <h2 style="margin-top:0;font-size:16px;">匯款資訊</h2>
      <p>銀行代碼：${escapeEmailText(bankLabel)}</p>
      <p>帳號：<b>${escapeEmailText(bankAccount)}</b></p>
      <p style="color:#5f6856;">請依訂單畫面的付款資訊完成匯款，並透過 LINE 提供訂單編號與帳號後五碼供我們核對。付款狀態不明時，請先確認原訂單，避免重複付款。</p>
    </div>
    <div style="margin-top:24px;">
      <a href="https://shop.kiwimu.com/account" style="background:#1f3527;color:#f5f0e8;padding:14px 20px;text-decoration:none;border-radius:12px;font-weight:600;display:inline-block;">前往會員中心</a>
      <p style="font-size:14px;color:#5f6856;">有訂單或取貨問題，請透過 <a href="https://line.me/R/ti/p/@931cxefd" style="color:#1f3527;">LINE 官方帳號</a> 聯繫我們。</p>
    </div>
    <p style="font-size:12px;color:#5f6856;border-top:1px solid #d8d7c4;padding-top:16px;margin-top:32px;">月島甜點 · shop.kiwimu.com</p>
  </div>
</body></html>`;
  // 統一走 lib/email/resend.ts 的 sendEmail（檢查 { error }、缺 RESEND_FROM_EMAIL 不寄、不 throw）
  const sent = await sendEmail(data.to, `【${storeName}】訂單確認 - ${data.orderId}`, emailHtml);
  if (sent) console.log('Email 發送成功');
  return sent;
}

export async function notifyNewOrder(data: {
  orderId: string; customerName: string; phone: string; totalPrice: number;
  pickupTime: string; items: OrderItem[]; promoCode?: string; discountAmount?: number;
  originalPrice?: number; paymentDate?: string; deliveryMethod?: 'pickup' | 'delivery';
  deliveryAddress?: string; deliveryFee?: number; deliveryNotes?: string;
  orderSource?: string; utmSource?: string;
}): Promise<boolean> {
  // 通知開關：店家可在後台關閉新訂單 Discord 通知（預設開，行為不變）
  const ns = await getNotificationSettings();
  if (!ns.order_created.discord) {
    console.log('通知設定已關閉新訂單 Discord 通知，略過');
    return false;
  }
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
  manual?: boolean;
  selectedChannels?: StatusNotificationChannel[];
}): Promise<OrderStatusNotificationResult> {
  // 未指定通道時（自動觸發），採用後台 notification_settings；
  // 有指定時（後台手動重送）尊重呼叫端選擇。預設兩者皆開 → 行為不變。
  let defaultChannels: StatusNotificationChannel[] = ['discord', 'email'];
  if (!data.selectedChannels) {
    const ns = await getNotificationSettings();
    defaultChannels = [];
    if (ns.order_status.discord) defaultChannels.push('discord');
    if (ns.order_status.email) defaultChannels.push('email');
  }
  const selectedChannels = data.selectedChannels ?? defaultChannels;
  const shouldSendDiscord = selectedChannels.includes('discord');
  const shouldSendEmail = selectedChannels.includes('email');

  // 1. Discord 通知店家
  const msg = data.manual
    ? `🔁 手動重送訂單通知: ${data.orderId}\n${data.customerName} 的訂單目前狀態為 **${data.newStatus}**`
    : `🔄 訂單狀態更新: ${data.orderId}\n${data.customerName} 的訂單從 ${data.oldStatus} 變更為 **${data.newStatus}**`;
  const discordConfigured = isDiscordConfigured();
  const discord = shouldSendDiscord && discordConfigured
    ? await sendDiscordNotify(msg)
    : false;
  const discordResult: NotificationDeliveryResult = !shouldSendDiscord
    ? {
      channel: 'discord',
      state: 'skipped',
      message: data.manual ? '本次未選擇重送 Discord' : '本次未啟用 Discord 通知',
    }
    : !discordConfigured
    ? {
      channel: 'discord',
      state: 'skipped',
      message: 'Discord 未設定，已略過店家通知',
    }
    : discord
      ? {
        channel: 'discord',
        state: 'sent',
        message: data.manual ? 'Discord 店家通知已重送' : 'Discord 店家通知已送出',
      }
      : {
        channel: 'discord',
        state: 'failed',
        message: 'Discord 店家通知送出失敗，請查看 runtime logs',
      };

  // 2. Email 通知客戶（只在 ready / cancelled 且有 email）
  if (!shouldSendEmail) {
    return {
      success: discordResult.state !== 'failed',
      discord: discordResult,
      email: {
        channel: 'email',
        state: 'skipped',
        message: data.manual ? '本次未選擇重送客戶 Email' : '本次未啟用客戶 Email 通知',
      },
    };
  }

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
      const fields: Record<string, string> = {
        customer_name: data.customerName ?? '',
        order_id: data.orderId ?? '',
        pickup_time: data.pickupTime ?? '',
      };
      // Keep merchant markup; a single callback pass preserves literal $& and field-like text.
      html = renderEmailTextTemplate(tpl.html_content, fields);
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
      console.log(`[Email] 狀態通知發送成功 (${data.newStatus})`);
      return {
        success: discordResult.state !== 'failed',
        discord: discordResult,
        email: {
          channel: 'email',
          state: 'sent',
          message: data.manual
            ? `客戶 Email 已重送至 ${data.email}`
            : `客戶 Email 已寄至 ${data.email}`,
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
  const ns = await getNotificationSettings();
  if (!ns.pickup_reminder.discord) return false;
  const itemsList = (data.items || []).map((i) => `• ${i.name} x${i.quantity}`).join('\n');
  const message = `📦 明日取貨提醒\n訂單: ${data.orderId}\n客戶: ${data.customerName}\n電話: ${data.phone || '-'}\n時間: ${data.pickupTime}\n\n${itemsList}`;
  return sendDiscordNotify(message);
}
