'use client'

import { useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'

export interface WheelSegment {
  label: string
  icon: string
  detail: string
}

const COLORS = [
  'rgb(var(--c-rose-300))',
  'rgb(var(--c-lilac-300))',
  'rgb(var(--c-rose-100))',
  'rgb(var(--c-gold))',
]

/** Roleta com desaceleração suave e resultado sorteado antes da animação. */
export function Wheel({
  segments,
  onSpun,
}: {
  segments: WheelSegment[]
  onSpun: (label: string) => void
}) {
  const controls = useAnimation()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<WheelSegment | null>(null)

  const slice = 360 / Math.max(segments.length, 1)

  async function spin() {
    if (spinning || segments.length === 0) return
    setSpinning(true)
    setResult(null)

    const target = Math.floor(Math.random() * segments.length)
    // 5 voltas completas + parada no meio da fatia sorteada.
    const angle = 360 * 5 + (360 - target * slice - slice / 2)

    await controls.start({
      rotate: angle,
      transition: { duration: 3.6, ease: [0.16, 1, 0.3, 1] },
    })

    setResult(segments[target])
    setSpinning(false)
  }

  return (
    <Card>
      <CardBody className="space-y-6 p-6">
        <div className="relative mx-auto aspect-square w-full max-w-xs">
          {/* ponteiro */}
          <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl">▼</span>

          <motion.div
            animate={controls}
            className="h-full w-full rounded-full border-4 border-surface shadow-lift"
            style={{
              background: `conic-gradient(${segments
                .map((_, index) => {
                  const color = COLORS[index % COLORS.length]
                  return `${color} ${index * slice}deg ${(index + 1) * slice}deg`
                })
                .join(', ')})`,
            }}
          >
            {segments.map((segment, index) => (
              <span
                key={segment.label}
                className="absolute left-1/2 top-1/2 origin-left text-lg"
                style={{
                  transform: `rotate(${index * slice + slice / 2}deg) translateX(4.5rem)`,
                }}
              >
                {segment.icon}
              </span>
            ))}
          </motion.div>

          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-2xl shadow-soft">
            💫
          </span>
        </div>

        {result ? (
          <div className="space-y-3 text-center">
            <p className="label">A roleta decidiu</p>
            <p className="font-display text-3xl text-ink">
              {result.icon} {result.label}
            </p>
            <p className="text-sm text-ink-soft">{result.detail}</p>
            <Button size="lg" className="w-full" onClick={() => onSpun(result.label)}>
              Aceitar e continuar
            </Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" loading={spinning} onClick={spin}>
            {spinning ? 'Girando...' : 'Girar a roleta'}
          </Button>
        )}
      </CardBody>
    </Card>
  )
}
