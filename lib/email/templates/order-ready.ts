interface OrderReadyParams {
  customerName: string;
  orderNumber: string;
  pickupTime: string;
  items: { name: string; variant_name?: string; quantity: number; price: number }[];
}

export function orderReadyTemplate({ customerName, orderNumber, pickupTime, items }: OrderReadyParams): {
  subject: string;
  html: string;
} {
  const itemRows = items
    .map((item) => {
      const variant = item.variant_name ? ` (${item.variant_name})` : '';
      return `<tr>
        <td style="padding:6px 0;border-bottom:1px solid rgba(201,169,110,0.15);">${item.name}${variant}</td>
        <td style="padding:6px 0;border-bottom:1px solid rgba(201,169,110,0.15);text-align:center;">x${item.quantity}</td>
        <td style="padding:6px 0;border-bottom:1px solid rgba(201,169,110,0.15);text-align:right;">$${item.price * item.quantity}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
  <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f5f0e8;padding:40px 32px;">

    <h1 style="color:#c9a96e;font-weight:300;letter-spacing:0.3em;font-size:20px;margin:0 0 32px;text-align:center;">
      MOON MOON
    </h1>

    <p style="font-size:16px;margin:0 0 8px;">親愛的 ${customerName}，</p>
    <p style="color:#c9a96e;font-size:18px;margin:0 0 24px;">您的訂單已準備好，可以取貨了！</p>

    <div style="background:#111;border:1px solid rgba(201,169,110,0.3);border-radius:4px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#999;letter-spacing:0.1em;">訂單編號</p>
      <p style="margin:0 0 16px;font-size:16px;font-weight:bold;">${orderNumber}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#999;letter-spacing:0.1em;">取貨時間</p>
      <p style="margin:0;font-size:16px;color:#c9a96e;">${pickupTime}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr>
          <th style="text-align:left;font-size:12px;letter-spacing:0.1em;color:#999;padding-bottom:8px;border-bottom:1px solid rgba(201,169,110,0.3);">商品</th>
          <th style="text-align:center;font-size:12px;letter-spacing:0.1em;color:#999;padding-bottom:8px;border-bottom:1px solid rgba(201,169,110,0.3);">數量</th>
          <th style="text-align:right;font-size:12px;letter-spacing:0.1em;color:#999;padding-bottom:8px;border-bottom:1px solid rgba(201,169,110,0.3);">小計</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <p style="font-size:14px;color:#aaa;margin:0 0 8px;">期待在店裡見到您！🍰</p>

    <p style="color:#c9a96e;font-size:11px;letter-spacing:0.2em;margin-top:40px;padding-top:16px;border-top:1px solid rgba(201,169,110,0.3);text-align:center;">
      月島甜點 · 台南安南區 · shop.kiwimu.com
    </p>
  </div>
</body>
</html>`;

  return {
    subject: '【月島甜點】您的訂單可以取貨了！',
    html,
  };
}
