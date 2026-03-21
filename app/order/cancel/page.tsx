'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { XCircle } from 'lucide-react';
import Link from 'next/link';

function CancelContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId');

  return (
    <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <XCircle className="w-12 h-12 text-moon-muted mx-auto" />
          <h2 className="text-xl text-moon-accent tracking-widest">已取消付款</h2>
          <p className="text-xs text-moon-muted tracking-wider">PAYMENT CANCELLED</p>
        </div>

        <div className="border border-moon-border/30 p-5 space-y-3 bg-moon-dark/40">
          {orderId && (
            <div className="flex justify-between text-sm">
              <span className="text-moon-muted">訂單編號</span>
              <span className="text-moon-accent font-mono tracking-widest">{orderId}</span>
            </div>
          )}
          <p className="text-xs text-moon-muted">
            您已取消 LINE Pay 付款。訂單仍保留，若需完成付款請重新結帳或聯繫我們。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/"
            className="flex items-center justify-center border border-moon-border text-moon-text py-3 text-xs tracking-widest hover:border-moon-accent hover:text-moon-accent transition-colors"
          >
            返回選購
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

export default function OrderCancelPage() {
  return (
    <Suspense>
      <CancelContent />
    </Suspense>
  );
}
