import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  meta?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon,
  action,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {icon ? <span className="text-moon-accent">{icon}</span> : null}
          <h1 className="text-2xl font-light tracking-wider text-moon-accent">{title}</h1>
        </div>
        {description ? <p className="mt-2 text-sm text-moon-muted">{description}</p> : null}
        {meta ? <div className="mt-2 text-xs text-moon-muted">{meta}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
