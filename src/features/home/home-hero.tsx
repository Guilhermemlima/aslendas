'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Sparkles } from 'lucide-react'
import { LiveRelationshipCounter } from '@/components/motion/countdown'
import { Petals } from '@/components/motion/particles'
import { Confetti } from '@/components/motion/confetti'
import { ButtonLink } from '@/components/ui/button'
import { relationshipTime, nextMilestone, formatDate } from '@/lib/date'
import type { Couple } from '@/types/db'

/**
 * Cabeçalho da Home. No aniversário de namoro o clima muda sozinho:
 * pétalas, confete e uma faixa dourada.
 */
export function HomeHero({
  couple,
  quote,
  coverUrl,
  meName,
  partnerName,
  isAnniversary,
}: {
  couple: Couple
  quote: string | null
  coverUrl: string | null
  meName: string
  partnerName: string | null
  isAnniversary: boolean
}) {
  const time = relationshipTime(`${couple.started_at}T00:00:00`)
  const milestone = nextMilestone(`${couple.started_at}T00:00:00`)

  return (
    <section className="relative">
      {isAnniversary && (
        <>
          <Petals />
          <Confetti active pieces={80} duration={5000} />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="card overflow-hidden"
      >
        <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-romance">
              <Heart className="h-14 w-14 text-rose-300" aria-hidden />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            {isAnniversary && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-3 py-1 text-xs font-medium text-white shadow-soft">
                <Sparkles className="h-3.5 w-3.5" />
                Hoje faz {time.years} {time.years === 1 ? 'ano' : 'anos'} de nós
              </span>
            )}
            <h1 className="font-display text-3xl leading-tight text-white drop-shadow sm:text-5xl">
              {couple.name}
            </h1>
            <p className="mt-1 text-sm text-white/85">
              {meName}
              {partnerName ? ` & ${partnerName}` : ''} · desde {formatDate(`${couple.started_at}T12:00:00`)}
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          {(quote || couple.tagline) && (
            <p className="text-balance text-center font-hand text-xl text-rose-700 sm:text-2xl">
              “{quote || couple.tagline}”
            </p>
          )}

          <div>
            <p className="label mb-2 text-center">Estamos juntos há</p>
            <LiveRelationshipCounter startedAt={couple.started_at} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-center text-sm text-ink-soft">
            <span className="rounded-full bg-rose-50 px-3 py-1">
              {time.years > 0 && `${time.years}a `}
              {time.months > 0 && `${time.months}m `}
              {time.days}d juntos
            </span>
            {milestone && (
              <span className="rounded-full bg-lilac-100 px-3 py-1 text-lilac-500">
                faltam {milestone.remaining} dias para {milestone.days.toLocaleString('pt-BR')} dias
              </span>
            )}
            <span className="rounded-full bg-gold/15 px-3 py-1 text-gold">
              {time.daysToAnniversary === 0
                ? 'É hoje!'
                : `${time.daysToAnniversary} dias para o nosso aniversário`}
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <ButtonLink href="/historia" variant="primary">
              Nossa história
            </ButtonLink>
            <ButtonLink href="/galeria?aleatoria=1" variant="secondary">
              Reviver um momento
            </ButtonLink>
            <ButtonLink href="/jogos" variant="outline">
              Jogar juntos
            </ButtonLink>
          </div>

          <p className="text-center text-xs text-ink-faint">
            <Link href="/configuracoes" className="hover:underline">
              Personalizar a Home
            </Link>
          </p>
        </div>
      </motion.div>
    </section>
  )
}
