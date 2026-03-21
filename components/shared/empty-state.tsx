import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-moon-border bg-moon-dark/30 px-6 py-12 text-center",
        className
      )}
    >
      <p className="text-base text-moon-text">{title}</p>
      {description ? <p className="mt-2 text-sm text-moon-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
