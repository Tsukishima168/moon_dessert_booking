'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId');

  return (
    <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <CheckCircle className="w-12 h-12 text-moon-accent mx-auto" />
          <h2 className="text-xl text-moon-accent tracking-widest">付款成功</h2>
          <p className="text-xs text-moon-muted tracking-wider">PAYMENT CONFIRMED</p>
        </div>

        <div className="border border-moon-border/30 p-5 space-y-3 bg-moon-dark/40">
          {orderId && (
            <div className="flex justify-between text-sm">
              <span className="text-moon-muted">訂單編號</span>
              <span className="text-moon-accent font-mono tracking-widest">{orderId}</span>
            </div>
          )}
          <p className="text-xs text-moon-muted">
            LINE Pay 付款已確認。我們將盡快處理您的訂單，並在可取貨時通知您。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/account"
            className="flex items-center justify-center border border-moon-border text-moon-text py-3 text-xs tracking-widest hover:border-moon-accent hover:text-moon-accent transition-colors"
          >
            前往會員中心
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center text-center text-xs text-moon-muted underline underline-offset-4 py-3 transition-colors hover:text-moon-accent"
          >
            返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
