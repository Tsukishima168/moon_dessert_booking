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
    ? `<div style="background:#111;border-left:3px solid rgba(201,169,110,0.5);padding:12px 16px;margin:16px 0;font-size:14px;color:#aaa;">${reason}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
  <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f5f0e8;padding:40px 32px;">

    <h1 style="color:#c9a96e;font-weight:300;letter-spacing:0.3em;font-size:20px;margin:0 0 32px;text-align:center;">
      MOON MOON
    </h1>

    <p style="font-size:16px;margin:0 0 8px;">親愛的 ${customerName}，</p>
    <p style="font-size:16px;margin:0 0 24px;">很抱歉通知您，您的訂單已取消。</p>

    <div style="background:#111;border:1px solid rgba(201,169,110,0.3);border-radius:4px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;color:#999;letter-spacing:0.1em;">訂單編號</p>
      <p style="margin:0;font-size:16px;font-weight:bold;">${orderNumber}</p>
    </div>

    ${reasonBlock}

    <p style="font-size:14px;color:#aaa;margin:0 0 8px;">
      如有任何疑問，歡迎透過 LINE 或電話與我們聯繫，我們很樂意協助您。
    </p>

    <p style="color:#c9a96e;font-size:11px;letter-spacing:0.2em;margin-top:40px;padding-top:16px;border-top:1px solid rgba(201,169,110,0.3);text-align:center;">
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
