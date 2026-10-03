import { Resend } from 'resend';

/**
 * 全站唯一的 Resend client（其他檔案不得自行 new Resend）。
 * 未設定 RESEND_API_KEY 時為 null，sendEmail 會略過並回傳 false。
 */
const client = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const DEFAULT_FROM_NAME = 'MoonMoon Dessert';

export type SendEmailResult =
  | { ok: true; id: string | null }
  | {
      ok: false;
      reason: 'no_api_key' | 'no_from_email' | 'api_error' | 'exception';
      message: string;
    };

/**
 * 發送 Email 並回傳結構化結果（含 Resend message id / 失敗原因）。
 * 永遠不 throw。Resend SDK v6 不會對 API 拒絕丟例外，而是回傳 { data, error }，
 * 所以必須檢查 error；網路層例外另外用 try/catch 接住。
 *
 * 不再 fallback 到 Resend 沙盒寄件者：它只能寄給帳號擁有者，
 * 缺 RESEND_FROM_EMAIL 時（例如 Preview）寧可明確略過，也不要靜默失敗。
 */
export async function sendEmailDetailed(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  if (!client) {
    console.warn('[sendEmail] RESEND_API_KEY 未設定，略過');
    return { ok: false, reason: 'no_api_key', message: 'RESEND_API_KEY 未設定' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!fromEmail) {
    console.error('[sendEmail] RESEND_FROM_EMAIL 未設定，略過');
    return { ok: false, reason: 'no_from_email', message: 'RESEND_FROM_EMAIL 未設定' };
  }

  const fromName = process.env.RESEND_FROM_NAME?.trim() || DEFAULT_FROM_NAME;
  const from = `${fromName} <${fromEmail}>`;

  try {
    const { data, error } = await client.emails.send({ from, to, subject, html });

    if (error) {
      console.error('[sendEmail] 發送失敗:', error);
      return { ok: false, reason: 'api_error', message: error.message };
    }

    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    console.error('[sendEmail] 發送失敗:', err);
    return {
      ok: false,
      reason: 'exception',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * 發送 Email。失敗只 console.error，不 throw，不阻塞主流程。
 * 回傳 boolean 讓上層可以顯示實際結果。
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const result = await sendEmailDetailed(to, subject, html);
  return result.ok;
}
