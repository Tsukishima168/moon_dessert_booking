import { Resend } from 'resend';

const client = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = `${process.env.RESEND_FROM_NAME ?? 'MoonMoon Dessert'} <${process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'}>`;

/**
 * 發送 Email。失敗只 console.error，不 throw，不阻塞主流程。
 * 回傳 boolean 讓上層可以顯示實際結果。
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!client) {
    console.warn('[sendEmail] RESEND_API_KEY 未設定，略過');
    return false;
  }

  const { error } = await client.emails.send({ from: FROM, to, subject, html });

  if (error) {
    console.error('[sendEmail] 發送失敗:', error);
    return false;
  }

  return true;
}
