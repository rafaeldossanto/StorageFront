import { monogramOf } from '@/lib/monogram'
import { cn } from '@/lib/utils'

export function Monogram({ name, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-[11px] font-semibold text-accent-foreground',
        className,
      )}
    >
      {monogramOf(name)}
    </span>
  )
}
