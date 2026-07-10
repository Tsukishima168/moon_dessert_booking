import Link from 'next/link';

// 全站 404 頁：提供 notFound()（例如 /product/[idOrSlug] 查無商品時）的自訂版面。
export default function NotFound() {
  return (
    <div className="min-h-screen bg-moon-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <p className="text-xs text-moon-muted tracking-widest mb-4">404</p>
        <h1 className="brand-display text-xl sm:text-2xl mb-4">找不到這個頁面</h1>
        <p className="brand-body text-sm text-moon-muted/90 mb-8">
          你要找的頁面或商品可能已下架，或連結有誤。
        </p>
        <Link
          href="/"
          className="inline-block bg-moon-accent text-moon-black px-8 py-4 text-xs sm:text-sm tracking-[0.3em] hover:bg-moon-text transition-colors"
        >
          回到首頁
        </Link>
      </div>
    </div>
  );
}
