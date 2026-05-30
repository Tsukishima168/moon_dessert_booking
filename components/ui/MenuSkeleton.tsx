/**
 * MenuSkeleton — 顧客端訂購頁專用菜單載入骨架
 * 使用 globals.css 的 .skeleton shimmer（雙主題走 moon-* token）。
 * 與 shadcn 的 components/ui/skeleton（admin 用、animate-pulse）刻意區隔。
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function MenuSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="border border-moon-border/40 bg-moon-dark/30" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-5 py-4 px-4 border-b border-moon-border/20 last:border-0"
        >
          <Bar className="w-20 h-20 shrink-0" />
          <div className="flex-1 space-y-2">
            <Bar className="h-4 w-1/3" />
            <Bar className="h-3 w-2/3" />
          </div>
          <Bar className="h-8 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}
