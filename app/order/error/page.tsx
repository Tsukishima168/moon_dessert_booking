'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { XCircle } from 'lucide-react';
import Link from 'next/link';

const REASON_MAP: Record<string, string> = {
  missing_params: '付款資訊不完整，請重新嘗試。',
  order_not_found: '找不到對應訂單，請聯繫月島甜點確認。',
  confirm_failed: 'LINE Pay 確認付款失敗，請重新嘗試或改用其他付款方式。',
  server_error: '系統發生錯誤，請稍後再試或聯繫月島甜點。',
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') ?? 'server_error';
  const code = searchParams.get('code');
  const message = REASON_MAP[reason] ?? REASON_MAP.server_error;

  return (
    <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <XCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl text-moon-accent tracking-widest">付款未完成</h2>
          <p className="text-xs text-moon-muted tracking-wider">PAYMENT FAILED</p>
        </div>

        <div className="border border-red-400/20 p-5 space-y-3 bg-red-400/5">
          <p className="text-sm text-moon-text">{message}</p>
          {code && (
            <p className="text-xs text-moon-muted">錯誤代碼：{code}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/"
            className="flex items-center justify-center border border-moon-border text-moon-text py-3 text-xs tracking-widest hover:border-moon-accent hover:text-moon-accent transition-colors"
          >
            返回重新下單
          </Link>
          <a
            href="https://line.me/R/ti/p/@931cxefd"
            className="flex items-center justify-center text-center text-xs text-[#00B900] border border-[#00B900]/30 py-3 hover:bg-[#00B900]/10 transition-colors"
          >
            聯繫月島甜點
          </a>
        </div>
      </div>
    </div>
  );
}

export default function OrderErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
