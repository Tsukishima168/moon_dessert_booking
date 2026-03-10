import { Resend } from 'resend';

/**
 * Resend Email client（singleton）
 * 未設定 RESEND_API_KEY 時為 null，呼叫前需先做 null check。
 */
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
