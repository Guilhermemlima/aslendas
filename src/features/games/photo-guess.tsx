'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Progress } from '@/components/ui/misc'

export interface GuessPhoto {
  id: string
  url: string
  caption: string | null
  year: number
}

const STEPS = [24, 16, 10, 6, 3, 0]

/** A foto começa muito borrada e vai revelando aos poucos. */
export function PhotoGuess({
  photo,
  onResult,
}: {
  photo: GuessPhoto
  onResult: (correct: boolean) => void
}) {
  const [step, setStep] = useState(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setStep(0)
    setRevealed(false)
  }, [photo.id])

  const blur = STEPS[Math.min(step, STEPS.length - 1)]

  return (
    <Card className="overflow-hidden">
      <CardBody className="space-y-5 p-6">
        <div>
          <p className="label mb-1">Adivinhe a foto</p>
          <p className="text-sm text-ink-soft">Quando foi? Onde foi? Vale palpite em voz alta.</p>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-rose-100">
          <motion.img
            key={photo.id}
            src={photo.url}
            alt=""
            animate={{ filter: `blur(${revealed ? 0 : blur}px)`, scale: revealed ? 1 : 1.08 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full w-full object-cover"
          />
        </div>

        {!revealed && (
          <>
            <Progress value={step / (STEPS.length - 1)} />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={step >= STEPS.length - 1}
                onClick={() => setStep((current) => current + 1)}
              >
                Revelar um pouco
              </Button>
              <Button className="flex-1" onClick={() => setRevealed(true)}>
                Mostrar tudo
              </Button>
            </div>
          </>
        )}

        {revealed && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-center">
              <p className="font-display text-xl text-ink">{photo.caption ?? 'Sem legenda'}</p>
              <p className="text-sm text-ink-soft">{photo.year}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => onResult(false)}>
                Errei essa
              </Button>
              <Button onClick={() => onResult(true)}>Acertei!</Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
