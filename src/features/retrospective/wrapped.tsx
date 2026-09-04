'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Confetti } from '@/components/motion/confetti'
import { cn } from '@/lib/utils'
import type { YearSummary } from '@/app/(app)/retrospectiva/page'

interface Slide {
  eyebrow: string
  value: string
  headline: string
  detail: string
  gradient: string
}

/** Apresentação estilo "Wrapped": um número grande por vez. */
export function Wrapped({
  coupleName,
  summary,
  years,
}: {
  coupleName: string
  summary: YearSummary
  years: number[]
}) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [celebrate, setCelebrate] = useState(false)

  const slides = buildSlides(coupleName, summary)
  const slide = slides[index]

  function next() {
    if (index + 1 >= slides.length) {
      setCelebrate(true)
      return
    }
    setIndex(index + 1)
  }

  return (
    <div className="space-y-5">
      <Confetti active={celebrate} onDone={() => setCelebrate(false)} pieces={80} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="title-display">Retrospectiva</h1>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => {
                setIndex(0)
                router.push(`/retrospectiva?ano=${year}`)
              }}
              className={cn(
                'focus-ring shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                summary.year === year
                  ? 'border-rose-300 bg-rose-100 font-medium text-rose-700'
                  : 'border-line bg-surface/60 text-ink-soft hover:border-rose-300',
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-card shadow-lift">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-[26rem] flex-col items-center justify-center gap-4 p-8 text-center sm:min-h-[32rem]"
            style={{ background: slide.gradient }}
          >
            <p className="label text-ink/70">{slide.eyebrow}</p>

            <motion.p
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
              className="font-display text-7xl leading-none text-ink sm:text-8xl"
            >
              {slide.value}
            </motion.p>

            <p className="text-balance font-display text-2xl text-ink">{slide.headline}</p>
            <p className="max-w-sm text-balance text-sm text-ink-soft">{slide.detail}</p>
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-x-0 top-3 flex justify-center gap-1.5 px-6">
          {slides.map((_, position) => (
            <span
              key={position}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                position <= index ? 'bg-ink/40' : 'bg-ink/10',
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex(Math.max(0, index - 1))}
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Button>
        <span className="text-sm text-ink-faint">
          {index + 1} / {slides.length}
        </span>
        <Button onClick={next}>
          {index + 1 >= slides.length ? 'Comemorar 🎉' : 'Próximo'}
          {index + 1 < slides.length && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

function buildSlides(coupleName: string, summary: YearSummary): Slide[] {
  const rose = 'linear-gradient(160deg, rgb(var(--c-rose-100)), rgb(var(--c-cream)))'
  const lilac = 'linear-gradient(160deg, rgb(var(--c-lilac-100)), rgb(var(--c-cream)))'
  const gold = 'linear-gradient(160deg, rgb(var(--c-gold) / 0.25), rgb(var(--c-cream)))'

  const slides: Slide[] = [
    {
      eyebrow: `${coupleName} · ${summary.year}`,
      value: String(summary.memories),
      headline: summary.memories === 1 ? 'memória guardada' : 'memórias guardadas',
      detail: 'Cada uma delas continua aqui, esperando ser relida.',
      gradient: rose,
    },
    {
      eyebrow: 'Registros',
      value: String(summary.photos + summary.videos),
      headline: 'fotos e vídeos',
      detail: `${summary.photos} fotos e ${summary.videos} vídeos foram parar na galeria.`,
      gradient: lilac,
    },
    {
      eyebrow: 'Linha do tempo',
      value: String(summary.events),
      headline: summary.events === 1 ? 'momento marcado' : 'momentos marcados',
      detail: 'Coisas que entraram para a história de vocês.',
      gradient: rose,
    },
    {
      eyebrow: 'Palavras',
      value: String(summary.letters),
      headline: summary.letters === 1 ? 'carta escrita' : 'cartas escritas',
      detail: 'Sem contar as que ainda estão fechadas esperando a data certa.',
      gradient: gold,
    },
    {
      eyebrow: 'Diversão',
      value: String(summary.games),
      headline: summary.games === 1 ? 'partida concluída' : 'partidas concluídas',
      detail: 'Perguntas, desafios e aquela discussão sobre quem conhece melhor quem.',
      gradient: lilac,
    },
    {
      eyebrow: 'No mapa',
      value: String(summary.places),
      headline: summary.places === 1 ? 'lugar novo' : 'lugares novos',
      detail: `E ${summary.dreams_done} ${summary.dreams_done === 1 ? 'sonho realizado' : 'sonhos realizados'} da lista.`,
      gradient: rose,
    },
  ]

  if (summary.top_tags.length > 0) {
    slides.push({
      eyebrow: 'O ano em uma palavra',
      value: summary.top_tags[0].tag,
      headline: 'foi a tag que mais apareceu',
      detail: summary.top_tags
        .slice(1)
        .map((tag) => `#${tag.tag}`)
        .join(' · '),
      gradient: gold,
    })
  }

  slides.push({
    eyebrow: 'Para o próximo ano',
    value: '∞',
    headline: 'ainda tem muito pela frente',
    detail: 'Continuem guardando. Um dia isso aqui vai valer muito.',
    gradient: rose,
  })

  return slides
}
