import { cn } from "@/lib/utils"

type LogoProps = {
  compact?: boolean
  className?: string
}

export function Logo({ compact = false, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-6 items-center gap-0.5" aria-hidden="true">
        <span className="h-5 w-1.5 rounded-sm bg-purple" />
        <span className="h-5 w-1.5 rounded-sm bg-purple opacity-75" />
        <span className="h-5 w-1.5 rounded-sm bg-purple opacity-50" />
      </div>

      {!compact && (
        <span className="text-2xl font-bold tracking-tight text-(--text-primary)">
          kanban
        </span>
      )}
    </div>
  )
}