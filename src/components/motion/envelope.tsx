'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ENVELOPE_STYLES } from '@/lib/constants'
import { cn } from '@/lib/utils'

function styleOf(value: string) {
  return ENVELOPE_STYLES.find((style) => style.value === value) ?? ENVELOPE_STYLES[0]
}

/**
 * Envelope que abre a aba, deixa a carta subir e revela o conteúdo.
 * Usado nas cartas e no "Abra quando...".
 */
export function Envelope({
  title,
  subtitle,
  style = 'rose',
  locked,
  lockedLabel = 'Ainda não é hora',
  onOpen,
  children,
}: {
  title: string
  subtitle?: string
  style?: string
  locked?: boolean
  lockedLabel?: string
  onOpen?: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const colors = styleOf(style)

  function handleOpen() {
    if (locked || open) return
    setOpen(true)
    onOpen?.()
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="closed"
            type="button"
            onClick={handleOpen}
            disabled={locked}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            whileHover={locked ? undefined : { y: -4, rotate: -0.5 }}
            className={cn(
              'focus-ring group relative block w-full overflow-hidden rounded-2xl p-6 text-left shadow-soft transition-shadow',
              locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:shadow-lift',
            )}
            style={{ background: `linear-gradient(140deg, ${colors.from}, ${colors.to})` }}
          >
            {/* aba do envelope */}
            <span
              className="pointer-events-none absolute inset-x-0 top-0 block h-24 origin-top transition-transform duration-500 group-hover:scale-y-75"
              style={{
                background: `linear-gradient(180deg, ${colors.to}, ${colors.from})`,
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                opacity: 0.85,
              }}
            />
            <span className="relative block pt-10">
              <span className="block font-display text-xl text-ink">{title}</span>
              {subtitle && <span className="mt-1 block text-sm text-ink-soft">{subtitle}</span>}
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-ink-soft">
                {locked ? `🔒 ${lockedLabel}` : '✨ Toque para abrir'}
              </span>
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            className="card overflow-hidden"
          >
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }} />
            <div className="p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
