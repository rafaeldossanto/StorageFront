import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatAmount, parseCents } from '@/lib/money'

// A price field: "R$" beside it, the amount typed the Brazilian way ("8,99"), and cents
// out. What was typed is kept as text while the person types - "8," is on its way to
// "8,90", not an error - and only read as cents when it is used.
//
// `onCentsChange(cents)` fires on every keystroke, with null while the text is not a
// price. `onCommit(cents)` fires on Enter or when the field loses focus - for a field that
// saves itself, like the price in the session panel.
//
// The text starts from `cents` and is not re-read when it changes; a parent that swaps the
// product behind the field gives it a new `key`, which makes React start it afresh.
export function MoneyInput({ cents, onCentsChange, onCommit, className, invalid, ...props }) {
  const [text, setText] = useState(cents == null ? '' : formatAmount(cents))

  function commit() {
    const parsed = parseCents(text)

    // Tidies "8,9" into "8,90" once the person is done with the field.
    if (parsed !== null) {
      setText(formatAmount(parsed))
    }

    onCommit?.(parsed)
  }

  return (
    <div
      className={cn(
        'flex h-9 items-center rounded-lg border border-input bg-card pl-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30',
        invalid && 'border-destructive ring-3 ring-destructive/20',
        className,
      )}
    >
      <span className="text-sm text-muted-foreground">R$</span>
      <input
        {...props}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          onCentsChange?.(parseCents(event.target.value))
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          // A field that saves itself takes the Enter. Inside a form, Enter is left alone
          // and submits the form, as in any other field.
          if (event.key === 'Enter' && onCommit) {
            event.preventDefault()
            commit()
          }
        }}
        className="h-full w-full min-w-0 bg-transparent px-2 font-mono text-sm tabular-nums outline-none"
      />
    </div>
  )
}
