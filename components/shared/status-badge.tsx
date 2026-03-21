import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const ORDER_STATUS_META = {
  pending: {
    label: "待付款",
    icon: "⏳",
    className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
  },
  paid: {
    label: "已付款",
    icon: "✅",
    className: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  },
  preparing: {
    label: "製作中",
    icon: "👨‍🍳",
    className: "border-orange-400/30 bg-orange-400/10 text-orange-400",
  },
  ready: {
    label: "可取貨",
    icon: "🎉",
    className: "border-green-400/30 bg-green-400/10 text-green-400",
  },
  completed: {
    label: "已完成",
    icon: "✨",
    className: "border-moon-border bg-moon-muted/10 text-moon-muted",
  },
  cancelled: {
    label: "已取消",
    icon: "❌",
    className: "border-red-400/30 bg-red-400/10 text-red-400",
  },
} as const

const FALLBACK_STATUS = {
  label: "未知狀態",
  icon: "•",
  className: "border-moon-border bg-moon-dark text-moon-muted",
}

export function getOrderStatusMeta(status: string) {
  return ORDER_STATUS_META[status as keyof typeof ORDER_STATUS_META] ?? {
    ...FALLBACK_STATUS,
    label: status || FALLBACK_STATUS.label,
  }
}

interface StatusBadgeProps {
  status: string
  className?: string
  showIcon?: boolean
}

export function StatusBadge({
  status,
  className,
  showIcon = false,
}: StatusBadgeProps) {
  const meta = getOrderStatusMeta(status)

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 px-2.5 py-1 text-[11px] font-medium", meta.className, className)}
    >
      {showIcon ? <span aria-hidden="true">{meta.icon}</span> : null}
      <span>{meta.label}</span>
    </Badge>
  )
}
