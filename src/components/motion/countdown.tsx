'use client'

import { useEffect, useState } from 'react'
import { countdownParts } from '@/lib/date'
import { cn } from '@/lib/utils'

/** Contagem regressiva viva (cápsulas, surpresas, datas). */
export function Countdown({
  target,
  onComplete,
  compact,
  className,
}: {
  target: string | Date
  onComplete?: () => void
  compact?: boolean
  className?: string
}) {
  const [parts, setParts] = useState(() => countdownParts(target))

  useEffect(() => {
    const tick = () => {
      const next = countdownParts(target)
      setParts(next)
      if (next.done) onComplete?.()
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [target, onComplete])

  if (compact) {
    return (
      <span className={cn('font-mono text-sm tabular-nums text-ink-soft', className)}>
        {parts.days}d {String(parts.hours).padStart(2, '0')}h {String(parts.minutes).padStart(2, '0')}m
      </span>
    )
  }

  const blocks = [
    { label: 'dias', value: parts.days },
    { label: 'horas', value: parts.hours },
    { label: 'min', value: parts.minutes },
    { label: 'seg', value: parts.seconds },
  ]

  return (
    <div className={cn('flex gap-2', className)}>
      {blocks.map((block) => (
        <div
          key={block.label}
          className="flex min-w-[3.75rem] flex-col items-center rounded-2xl border border-line/70 bg-surface/80 px-2 py-2.5"
        >
          <span className="font-display text-2xl tabular-nums text-ink">
            {String(block.value).padStart(2, '0')}
          </span>
          <span className="label mt-0.5">{block.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Contador de relacionamento em tempo real, usado na Home. */
export function LiveRelationshipCounter({
  startedAt,
  className,
}: {
  startedAt: string
  className?: string
}) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Renderiza vazio no servidor para não haver divergência de hidratação.
  if (!now) return <div className={cn('h-[4.5rem]', className)} />

  const start = new Date(`${startedAt}T00:00:00`)
  const elapsed = Math.max(0, now.getTime() - start.getTime())
  const blocks = [
    { label: 'dias', value: Math.floor(elapsed / 86_400_000) },
    { label: 'horas', value: Math.floor(elapsed / 3_600_000) % 24 },
    { label: 'minutos', value: Math.floor(elapsed / 60_000) % 60 },
    { label: 'segundos', value: Math.floor(elapsed / 1000) % 60 },
  ]

  return (
    <div className={cn('grid grid-cols-4 gap-2 sm:gap-3', className)}>
      {blocks.map((block) => (
        <div key={block.label} className="glass rounded-2xl px-1 py-3 text-center">
          <div className="font-display text-2xl tabular-nums text-ink sm:text-3xl">
            {block.value.toLocaleString('pt-BR')}
          </div>
          <div className="label mt-1">{block.label}</div>
        </div>
      ))}
    </div>
  )
}
