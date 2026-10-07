import { escapeEmailText } from '../html';

interface OrderCancelledParams {
  customerName: string;
  orderNumber: string;
  reason?: string;
}

export function orderCancelledTemplate({ customerName, orderNumber, reason }: OrderCancelledParams): {
  subject: string;
  html: string;
} {
  const reasonBlock = reason
    ? `<div style="background:#fffdf8;border-left:3px solid #d7c678;padding:12px 16px;margin:16px 0;font-size:14px;color:#5f6856;">${escapeEmailText(reason)}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f0e8;">
  <div style="font-family:'Noto Sans TC',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f0e8;color:#1f2f1f;padding:40px 32px;">

    <h1 style="color:#795b23;font-weight:600;letter-spacing:0.3em;font-size:20px;margin:0 0 32px;text-align:center;">
      MOON MOON
    </h1>

    <p style="font-size:16px;margin:0 0 8px;">親愛的 ${escapeEmailText(customerName)}，</p>
    <p style="font-size:16px;margin:0 0 24px;">很抱歉通知您，您的訂單已取消。</p>

    <div style="background:#fffdf8;border:1px solid #d8d7c4;border-radius:4px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;color:#5f6856;letter-spacing:0.1em;">訂單編號</p>
      <p style="margin:0;font-size:16px;font-weight:bold;">${escapeEmailText(orderNumber)}</p>
    </div>

    ${reasonBlock}

    <p style="font-size:14px;color:#5f6856;margin:0 0 8px;">
      如需確認取消原因或退款進度，請透過 <a href="https://line.me/R/ti/p/@931cxefd" style="color:#1f3527;text-decoration:underline;">LINE 官方帳號</a> 提供訂單編號，讓我們協助您。
    </p>

    <p style="color:#795b23;font-size:12px;letter-spacing:0.2em;margin-top:40px;padding-top:16px;border-top:1px solid #d8d7c4;text-align:center;">
      月島甜點 · 台南安南區 · shop.kiwimu.com
    </p>
  </div>
</body>
</html>`;

  return {
    subject: '【月島甜點】訂單取消通知',
    html,
  };
}
