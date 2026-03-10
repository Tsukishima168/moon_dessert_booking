/**
 * LINE Pay v3 API 客戶端
 *
 * 環境變數（Vercel 填入）：
 *   LINEPAY_CHANNEL_ID     - LINE Pay Channel ID
 *   LINEPAY_CHANNEL_SECRET - LINE Pay Channel Secret Key
 *   LINEPAY_API_URL        - https://sandbox-api-pay.line.me (測試) | https://api-pay.line.me (正式)
 *   NEXT_PUBLIC_SITE_URL   - 網站根 URL（用於組合 confirmUrl / cancelUrl）
 */

import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LinePayProduct {
  id: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  price: number; // 單價（整數，NTD）
}

export interface LinePayRequestBody {
  amount: number;             // 總金額（整數）
  currency: 'TWD';
  orderId: string;
  packages: Array<{
    id: string;
    amount: number;
    name: string;
    products: LinePayProduct[];
  }>;
  redirectUrls: {
    confirmUrl: string;       // 付款完成後 LINE Pay 導回此 URL
    cancelUrl: string;        // 用戶取消後導回
  };
  options?: {
    payment?: {
      capture?: boolean;      // true = 直接請款（預設 true）
    };
    display?: {
      locale?: 'zh_TW' | 'en' | 'ja';
    };
  };
}

export interface LinePayRequestResponse {
  returnCode: string;         // '0000' = 成功
  returnMessage: string;
  info?: {
    transactionId: number;
    paymentUrl: {
      web: string;            // 桌面版付款頁面 URL
      app: string;            // 深層連結
    };
    paymentAccessToken: string;
  };
}

export interface LinePayConfirmBody {
  amount: number;
  currency: 'TWD';
}

export interface LinePayConfirmResponse {
  returnCode: string;
  returnMessage: string;
  info?: {
    transactionId: number;
    orderId: string;
    transactionDate: string;
    payInfo: Array<{
      method: string;
      amount: number;
    }>;
  };
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class LinePayClient {
  private channelId: string;
  private channelSecret: string;
  private apiUrl: string;

  constructor() {
    this.channelId = process.env.LINEPAY_CHANNEL_ID!;
    this.channelSecret = process.env.LINEPAY_CHANNEL_SECRET!;
    this.apiUrl = process.env.LINEPAY_API_URL ?? 'https://sandbox-api-pay.line.me';

    if (!this.channelId || !this.channelSecret) {
      throw new Error('LINEPAY_CHANNEL_ID 和 LINEPAY_CHANNEL_SECRET 尚未設定');
    }
  }

  /**
   * 生成 LINE Pay v3 HMAC-SHA256 授權標頭
   * 公式：HMAC-SHA256(ChannelSecret, ChannelSecret + URI + RequestBody/QueryString + Nonce)
   */
  private generateAuthHeader(uri: string, body: string): Record<string, string> {
    const nonce = crypto.randomUUID();
    const message = `${this.channelSecret}${uri}${body}${nonce}`;
    const signature = crypto
      .createHmac('SHA256', this.channelSecret)
      .update(message)
      .digest('base64');

    return {
      'Content-Type': 'application/json',
      'X-LINE-ChannelId': this.channelId,
      'X-LINE-Authorization-Nonce': nonce,
      'X-LINE-Authorization': signature,
    };
  }

  /**
   * 發起付款請求（Payment Request）
   * LINE Pay 文件：POST /v3/payments/request
   */
  async requestPayment(payload: LinePayRequestBody): Promise<LinePayRequestResponse> {
    const uri = '/v3/payments/request';
    const body = JSON.stringify(payload);
    const headers = this.generateAuthHeader(uri, body);

    const res = await fetch(`${this.apiUrl}${uri}`, {
      method: 'POST',
      headers,
      body,
    });

    const data = await res.json() as LinePayRequestResponse;
    return data;
  }

  /**
   * 確認付款（Payment Confirm）
   * LINE Pay 文件：POST /v3/payments/{transactionId}/confirm
   */
  async confirmPayment(
    transactionId: string,
    payload: LinePayConfirmBody
  ): Promise<LinePayConfirmResponse> {
    const uri = `/v3/payments/${transactionId}/confirm`;
    const body = JSON.stringify(payload);
    const headers = this.generateAuthHeader(uri, body);

    const res = await fetch(`${this.apiUrl}${uri}`, {
      method: 'POST',
      headers,
      body,
    });

    const data = await res.json() as LinePayConfirmResponse;
    return data;
  }
}

/** 使用時呼叫（避免模組載入時因 env 未設定而拋錯） */
export function getLinePayClient(): LinePayClient {
  return new LinePayClient();
}
