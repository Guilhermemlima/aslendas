import { cn } from '@/lib/utils'

export function Badge({
  className,
  tone = 'rose',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'rose' | 'lilac' | 'gold' | 'neutral' }) {
  const tones = {
    rose: 'bg-rose-100 text-rose-700',
    lilac: 'bg-lilac-100 text-lilac-500',
    gold: 'bg-gold/15 text-gold',
    neutral: 'bg-line/60 text-ink-soft',
  } as const

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.7rem] font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

export function EmptyState({
  emoji = '✨',
  title,
  description,
  action,
}: {
  emoji?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <h3 className="font-display text-xl text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-line/50', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  )
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-line/70', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-500 transition-[width] duration-700"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="label mb-1">{eyebrow}</p>}
        <h2 className="title-display">{title}</h2>
        {description && <p className="mt-1.5 max-w-xl text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('gold-line my-6', className)} />
}
