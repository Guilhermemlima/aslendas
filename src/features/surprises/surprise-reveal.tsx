'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { markSurpriseRevealed } from '@/app/actions/surprises'
import { Confetti } from '@/components/motion/confetti'
import { Petals } from '@/components/motion/particles'
import { Button } from '@/components/ui/button'
import type { SurpriseWithMedia } from '@/services/content'

/**
 * Abre a surpresa em tela cheia assim que a pessoa entra no app na hora certa.
 * A marcação de "vista" acontece ao fechar, para não queimar a surpresa se a
 * página só piscou.
 */
export function SurpriseReveal({ surprise }: { surprise: SurpriseWithMedia }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 400)
    return () => clearTimeout(timer)
  }, [])

  async function close() {
    setOpen(false)
    await markSurpriseRevealed(surprise.id)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-md"
        >
          {surprise.animation === 'petalas' ? <Petals count={22} /> : <Confetti active pieces={90} duration={6000} />}

          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="glass w-full max-w-lg overflow-hidden rounded-3xl shadow-lift"
          >
            {surprise.media[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={surprise.media[0].url} alt="" className="h-56 w-full object-cover" />
            )}

            <div className="space-y-4 p-7 text-center">
              <p className="label">Uma surpresa para você</p>
              <h2 className="font-display text-3xl leading-tight text-ink">{surprise.title}</h2>
              <div className="gold-line" />
              <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink-soft">
                {surprise.message}
              </p>
              <Button onClick={close} size="lg" className="w-full">
                Guardar esse momento
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
