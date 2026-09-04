'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const COLORS = ['#E8A0AE', '#C5B2E2', '#C6A25A', '#F8E2E7', '#FFFFFF']

interface Piece {
  id: number
  x: number
  delay: number
  duration: number
  rotate: number
  color: string
  size: number
  shape: 'square' | 'circle' | 'heart'
}

/**
 * Confete leve, sem canvas nem dependência externa.
 * Dispara ao concluir um sonho, abrir uma cápsula ou em datas importantes.
 */
export function Confetti({
  active,
  pieces = 60,
  duration = 3200,
  onDone,
}: {
  active: boolean
  pieces?: number
  duration?: number
  onDone?: () => void
}) {
  const [visible, setVisible] = useState(active)

  useEffect(() => {
    if (!active) return
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onDone?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [active, duration, onDone])

  const items = useMemo<Piece[]>(
    () =>
      Array.from({ length: pieces }, (_, id) => ({
        id,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2 + Math.random() * 1.4,
        rotate: Math.random() * 720 - 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        shape: (['square', 'circle', 'heart'] as const)[Math.floor(Math.random() * 3)],
      })),
    [pieces],
  )

  return (
    <AnimatePresence>
      {visible && (
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
          {items.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{ y: '-10vh', opacity: 0, rotate: 0 }}
              animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: piece.rotate }}
              exit={{ opacity: 0 }}
              transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeIn' }}
              style={{
                position: 'absolute',
                left: `${piece.x}%`,
                width: piece.size,
                height: piece.size,
                background: piece.shape === 'heart' ? 'transparent' : piece.color,
                borderRadius: piece.shape === 'circle' ? '50%' : 2,
                color: piece.color,
                fontSize: piece.size + 4,
                lineHeight: 1,
              }}
            >
              {piece.shape === 'heart' ? '♥' : null}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
