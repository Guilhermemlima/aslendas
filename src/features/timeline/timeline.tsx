'use client'

import { useMemo, useState } from 'react'
import { MapPin, Music2, Star } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/misc'
import { Polaroid } from '@/components/motion/polaroid'
import { ScrollReveal, ScrollProgressLine } from '@/components/motion/gsap-scroll'
import { TIMELINE_CATEGORIES } from '@/lib/constants'
import { formatDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { MediaKind, TimelineCategory } from '@/types/db'

export interface TimelineMedia {
  id: string
  url: string | null
  kind: MediaKind
  caption: string | null
}

export interface TimelineEntry {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  category: TimelineCategory
  emoji: string | null
  tags: string[]
  isHighlight: boolean
  locationName: string | null
  song: { title: string; artist: string | null; url: string | null } | null
  media: TimelineMedia[]
}

const FILTERS: { value: TimelineCategory | 'todos' | 'destaques'; label: string }[] = [
  { value: 'todos', label: 'Tudo' },
  { value: 'destaques', label: '⭐ Destaques' },
  { value: 'inicio', label: 'O começo' },
  { value: 'encontro', label: 'Encontros' },
  { value: 'viagem', label: 'Viagens' },
  { value: 'aniversario', label: 'Aniversários' },
  { value: 'conquista', label: 'Conquistas' },
  { value: 'engracado', label: 'Engraçados' },
]

export function Timeline({ events }: { events: TimelineEntry[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('todos')
  const [selected, setSelected] = useState<TimelineEntry | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'todos') return events
    if (filter === 'destaques') return events.filter((event) => event.isHighlight)
    return events.filter((event) => event.category === filter)
  }, [events, filter])

  const byYear = useMemo(() => {
    const groups = new Map<string, TimelineEntry[]>()
    for (const event of filtered) {
      const year = event.date.slice(0, 4)
      groups.set(year, [...(groups.get(year) ?? []), event])
    }
    return [...groups.entries()].sort(([a], [b]) => Number(a) - Number(b))
  }, [filtered])

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              'focus-ring shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              filter === option.value
                ? 'border-rose-300 bg-rose-100 font-medium text-rose-700'
                : 'border-line bg-surface/60 text-ink-soft hover:border-rose-300',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="relative">
        {/* O fio se desenha conforme a pessoa rola, amarrado à posição do
            scroll — por isso é GSAP e não Framer Motion. */}
        <ScrollProgressLine className="absolute bottom-0 left-[0.9rem] top-2 w-px sm:left-1/2" />

        <div className="space-y-10">
          {byYear.map(([year, yearEvents]) => (
            <section key={year}>
              <div className="relative mb-6 flex sm:justify-center">
                <span className="relative z-10 rounded-full bg-gradient-gold px-4 py-1 font-display text-sm text-white shadow-soft">
                  {year}
                </span>
              </div>

              {/* A cascata é calculada para o ano inteiro: os cartões entram
                  encadeados, em vez de cada um disparar por conta própria. */}
              <ScrollReveal className="space-y-6" seletor=":scope > [data-cartao]">
                {yearEvents.map((event, index) => (
                  <TimelineCard
                    key={event.id}
                    event={event}
                    side={index % 2 === 0 ? 'left' : 'right'}
                    onOpen={() => setSelected(event)}
                  />
                ))}
              </ScrollReveal>
            </section>
          ))}
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title}
        description={selected ? formatDate(`${selected.date}T12:00:00`) : undefined}
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            {selected.description && (
              <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink-soft">
                {selected.description}
              </p>
            )}

            {selected.media.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {selected.media.map((item, index) =>
                  item.kind === 'image' ? (
                    <Polaroid key={item.id} src={item.url} caption={item.caption} rotate={index % 2 ? 2 : -2} />
                  ) : item.kind === 'video' ? (
                    <video key={item.id} src={item.url ?? undefined} controls className="w-full rounded-2xl" />
                  ) : (
                    <audio key={item.id} src={item.url ?? undefined} controls className="col-span-2 w-full" />
                  ),
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {selected.locationName && (
                <Badge tone="lilac">
                  <MapPin className="h-3 w-3" /> {selected.locationName}
                </Badge>
              )}
              {selected.song && (
                <Badge tone="gold">
                  <Music2 className="h-3 w-3" /> {selected.song.title}
                  {selected.song.artist ? ` — ${selected.song.artist}` : ''}
                </Badge>
              )}
              {selected.tags.map((tag) => (
                <Badge key={tag}>#{tag}</Badge>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function TimelineCard({
  event,
  side,
  onOpen,
}: {
  event: TimelineEntry
  side: 'left' | 'right'
  onOpen: () => void
}) {
  const meta = TIMELINE_CATEGORIES[event.category]

  // Sem motion aqui de propósito: quem anima a entrada é o ScrollReveal (GSAP)
  // do grupo do ano. Dois animadores no mesmo elemento se anulam.
  return (
    <div
      data-cartao
      className={cn(
        'relative pl-10 sm:w-1/2 sm:pl-0',
        side === 'left' ? 'sm:pr-10' : 'sm:ml-auto sm:pl-10',
      )}
    >
      {/* marcador */}
      <span
        className={cn(
          'absolute top-6 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-cream bg-surface text-xs shadow-soft',
          'left-0 sm:left-auto',
          side === 'left' ? 'sm:-right-3.5' : 'sm:-left-3.5',
        )}
      >
        {event.emoji ?? meta.emoji}
      </span>

      <button
        type="button"
        onClick={onOpen}
        className="focus-ring card card-hover block w-full overflow-hidden text-left"
      >
        {event.media[0]?.kind === 'image' && event.media[0].url && (
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.media[0].url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {event.isHighlight && (
              <span className="absolute right-3 top-3 rounded-full bg-gradient-gold p-1.5 text-white shadow-soft">
                <Star className="h-3.5 w-3.5 fill-current" />
              </span>
            )}
          </div>
        )}

        <div className="space-y-2 p-5">
          <div className="flex items-center gap-2">
            <span className="label">{meta.label}</span>
            <span className="text-xs text-ink-faint">
              {formatDate(`${event.date}T12:00:00`, "d 'de' MMM")}
              {event.time ? ` · ${event.time.slice(0, 5)}` : ''}
            </span>
          </div>

          <h3 className="font-display text-xl leading-snug text-ink">{event.title}</h3>

          {event.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">{event.description}</p>
          )}

          {(event.locationName || event.media.length > 1) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-ink-faint">
              {event.locationName && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {event.locationName}
                </span>
              )}
              {event.media.length > 1 && <span>+{event.media.length - 1} mídias</span>}
            </div>
          )}
        </div>
      </button>
    </div>
  )
}
