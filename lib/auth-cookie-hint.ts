/**
 * 不載入 supabase-js、只看 cookie 判斷「這個瀏覽器有沒有可能存著登入 session」。
 *
 * 為什麼可以這樣判斷：shop 的 supabase client 用 createSharedAuthStorage()（src/lib/auth-storage.ts），
 * session 只存在 cookie（key = sb-<ref>-auth-token，過大時拆成 <key> 與 <key>.0、<key>.1…），
 * 沒有 localStorage 備援。沒有這類 cookie，client.auth.getSession() 一定回 null。
 * 這裡的比對刻意放寬成任何 sb-*-auth-token：誤判成「有」只會多載一次 supabase-js（維持舊行為），
 * 不會誤判成「沒有」。
 *
 * 只能在瀏覽器端呼叫；SSR 回傳 false 沒有意義，呼叫端應只在 effect／事件裡用。
 */
const STORED_SESSION_COOKIE = /(?:^|;\s*)sb-[^=;\s]+-auth-token(?:\.\d+)?=/;

export function hasStoredAuthSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return STORED_SESSION_COOKIE.test(document.cookie);
  } catch {
    // 讀不到 cookie（極端隱私設定）就當作可能有，走原本的 supabase 流程。
    return true;
  }
}
