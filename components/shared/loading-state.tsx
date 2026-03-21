import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

interface LoadingStateProps {
  text?: string
  fullScreen?: boolean
  className?: string
}

export function LoadingState({
  text = "載入中...",
  fullScreen = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-20",
        fullScreen && "min-h-screen bg-moon-black",
        className
      )}
    >
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 animate-spin text-moon-accent" size={32} />
        <p className="text-sm text-moon-muted">{text}</p>
      </div>
    </div>
  )
}
