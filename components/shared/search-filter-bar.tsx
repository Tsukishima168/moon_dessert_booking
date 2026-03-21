import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface FilterOption {
  value: string
  label: string
}

interface SearchFilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterOption[]
  activeFilter?: string
  onFilterChange?: (value: string) => void
  className?: string
}

export function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "搜尋...",
  filters = [],
  activeFilter,
  onFilterChange,
  className,
}: SearchFilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      {filters.length > 0 && onFilterChange ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.value
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => onFilterChange(filter.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs tracking-wider transition-colors",
                  isActive
                    ? "border-moon-accent bg-moon-accent/10 text-moon-accent"
                    : "border-moon-border text-moon-muted hover:border-moon-muted hover:text-moon-text"
                )}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      ) : (
        <div />
      )}

      <div className="relative w-full sm:w-64">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-moon-muted" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="border-moon-border bg-moon-dark pl-9 text-sm text-moon-text placeholder:text-moon-muted/50 focus-visible:border-moon-accent focus-visible:ring-0"
        />
      </div>
    </div>
  )
}
