import { cn } from '@/lib/utils'

// The amber square with the initial - the mark in the sidebar and on the sign-in page.
export function BrandMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground',
        className,
      )}
    >
      S
    </span>
  )
}
