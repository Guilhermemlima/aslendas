'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CalendarHeart, Shuffle } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { Envelope } from '@/components/motion/envelope'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/reveal'
import { DATE_CATEGORIES } from '@/lib/constants'
import { formatDate } from '@/lib/date'
import type { DateCategory } from '@/types/db'

export interface HighlightDate {
  id: string
  title: string
  category: DateCategory
  daysAway: number
  occursOn: string
}

export interface HighlightMemory {
  id: string
  title: string
  description: string | null
  happenedOn: string | null
  coverUrl: string | null
}

export interface HighlightLetter {
  id: string
  title: string
  condition: string | null
  style: string
}

export function HomeHighlights({
  upcoming,
  memory,
  letter,
}: {
  upcoming: HighlightDate[]
  memory: HighlightMemory | null
  letter: HighlightLetter | null
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* ------------------------------------------------ memória aleatória */}
      <Reveal className="lg:col-span-2">
        <Card className="h-full overflow-hidden" hover>
          {memory ? (
            <Link href={`/historia#memoria-${memory.id}`} className="block h-full">
              <div className="grid h-full sm:grid-cols-[minmax(0,14rem)_1fr]">
                <div className="relative aspect-[4/3] sm:aspect-auto">
                  {memory.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={memory.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-romance text-3xl">
                      💭
                    </div>
                  )}
                </div>
                <CardBody className="flex flex-col justify-center gap-2 p-5">
                  <p className="label inline-flex items-center gap-1.5">
                    <Shuffle className="h-3.5 w-3.5" /> Memória aleatória
                  </p>
                  <h3 className="font-display text-2xl leading-snug text-ink">{memory.title}</h3>
                  {memory.happenedOn && (
                    <p className="text-xs text-ink-faint">{formatDate(`${memory.happenedOn}T12:00:00`)}</p>
                  )}
                  {memory.description && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">
                      {memory.description}
                    </p>
                  )}
                </CardBody>
              </div>
            </Link>
          ) : (
            <CardBody className="flex h-full flex-col items-center justify-center gap-2 py-14 text-center">
              <span className="text-3xl">💭</span>
              <p className="font-display text-xl text-ink">Nenhuma memória ainda</p>
              <p className="max-w-xs text-sm text-ink-soft">
                Guarde a primeira e ela vai voltar aqui de surpresa um dia.
              </p>
              <Link href="/admin/memorias" className="mt-1 text-sm font-medium text-rose-700 hover:underline">
                Adicionar memória
              </Link>
            </CardBody>
          )}
        </Card>
      </Reveal>

      {/* --------------------------------------------------- carta surpresa */}
      <Reveal delay={0.08}>
        {letter ? (
          <Envelope
            title={letter.condition ?? letter.title}
            subtitle="Uma carta esperando por você"
            style={letter.style}
          >
            <p className="font-display text-2xl text-ink">{letter.title}</p>
            <p className="mt-2 text-sm text-ink-soft">
              Ela está guardada em Cartas — abra com calma quando quiser.
            </p>
            <Link
              href={`/cartas#carta-${letter.id}`}
              className="mt-4 inline-block text-sm font-medium text-rose-700 hover:underline"
            >
              Ler a carta
            </Link>
          </Envelope>
        ) : (
          <Card className="h-full">
            <CardBody className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
              <span className="text-3xl">💌</span>
              <p className="font-display text-lg text-ink">Nenhuma carta fechada</p>
              <p className="text-sm text-ink-soft">Escreva uma para deixar guardada.</p>
              <Link href="/cartas" className="mt-1 text-sm font-medium text-rose-700 hover:underline">
                Escrever carta
              </Link>
            </CardBody>
          </Card>
        )}
      </Reveal>

      {/* ------------------------------------------------- próximas datas -- */}
      <Reveal className="lg:col-span-3" delay={0.12}>
        <Card>
          <CardBody className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="label inline-flex items-center gap-1.5">
                <CalendarHeart className="h-3.5 w-3.5" /> O que vem por aí
              </p>
              <Link href="/calendario" className="text-sm font-medium text-rose-700 hover:underline">
                Calendário
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-soft">
                Nenhuma data marcada ainda. Que tal adicionar a próxima viagem?
              </p>
            ) : (
              <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {upcoming.map((item) => (
                  <StaggerItem key={item.id}>
                    <motion.div
                      whileHover={{ y: -3 }}
                      className="flex h-full items-start gap-3 rounded-2xl border border-line/70 bg-surface/60 p-3.5"
                    >
                      <span className="text-xl" aria-hidden>
                        {DATE_CATEGORIES[item.category].emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                        <span className="block text-xs text-ink-faint">
                          {formatDate(item.occursOn, "d 'de' MMM")}
                        </span>
                        <span className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[0.65rem] text-rose-700">
                          {item.daysAway === 0
                            ? 'é hoje'
                            : item.daysAway === 1
                              ? 'amanhã'
                              : `em ${item.daysAway} dias`}
                        </span>
                      </span>
                    </motion.div>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </CardBody>
        </Card>
      </Reveal>
    </div>
  )
}
