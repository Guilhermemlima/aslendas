import Link from 'next/link'
import { requireCouple } from '@/services/session'
import {
  listImportantDates,
  listLetters,
  pendingSurprises,
  randomMemory,
  upcomingDates,
} from '@/services/content'
import { listMedia, onThisDay, signOne } from '@/services/media'
import { createClient } from '@/lib/supabase/server'
import { HomeHero } from '@/features/home/home-hero'
import { HomeHighlights } from '@/features/home/home-highlights'
import { SurpriseReveal } from '@/features/surprises/surprise-reveal'
import { Reveal } from '@/components/motion/reveal'
import { SectionHeading } from '@/components/ui/misc'
import { Polaroid } from '@/components/motion/polaroid'
import { isSameDayOfYear } from '@/lib/date'
import type { Media } from '@/types/db'

export default async function HomePage() {
  const { couple, me, partner, settings } = await requireCouple()

  const supabase = await createClient()
  const coverRow = couple.cover_media_id
    ? await supabase.from('media').select('*').eq('id', couple.cover_media_id).maybeSingle()
    : null

  const [cover, memory, dates, letters, surprises, thisDay, favoritas] = await Promise.all([
    signOne((coverRow?.data as Media | null) ?? null),
    randomMemory(couple.id),
    listImportantDates(couple.id),
    listLetters(couple.id),
    pendingSurprises(couple.id, me.id),
    onThisDay(couple.id),
    listMedia(couple.id, { kind: 'image', favoritesOnly: true, limit: 8 }),
  ])

  // As favoritas dão o tom da capa. Com menos de duas, o carrossel cai para as
  // fotos mais recentes — e a capa escolhida no perfil sempre abre a sequência.
  const acervo =
    favoritas.length >= 2
      ? favoritas
      : await listMedia(couple.id, { kind: 'image', limit: 8 })

  const heroPhotos = [
    ...(cover?.url ? [{ id: cover.id, url: cover.url, caption: cover.caption }] : []),
    ...acervo
      .filter((item) => item.url && item.id !== cover?.id)
      .map((item) => ({ id: item.id, url: item.url as string, caption: item.caption })),
  ].slice(0, 8)

  const upcoming = upcomingDates(dates, 4)
  const isAnniversary = isSameDayOfYear(`${couple.started_at}T12:00:00`, new Date())

  // Uma carta ainda não aberta vira o "envelope surpresa" da Home.
  const surpriseLetter = letters.find((letter) => !letter.opened_at && letter.author_id !== me.id)

  return (
    <div className="space-y-10">
      {surprises.length > 0 && <SurpriseReveal surprise={surprises[0]} />}

      <HomeHero
        couple={couple}
        quote={settings.home_quote}
        photos={heroPhotos}
        meName={me.display_name}
        partnerName={partner?.display_name ?? null}
        isAnniversary={isAnniversary}
      />

      <HomeHighlights
        upcoming={upcoming.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category,
          daysAway: item.daysAway,
          occursOn: item.occursOn.toISOString(),
        }))}
        memory={
          memory
            ? {
                id: memory.id,
                title: memory.title,
                description: memory.description,
                happenedOn: memory.happened_on,
                coverUrl: memory.cover?.url ?? null,
              }
            : null
        }
        letter={
          surpriseLetter
            ? {
                id: surpriseLetter.id,
                title: surpriseLetter.title,
                condition: surpriseLetter.open_condition,
                style: surpriseLetter.envelope_style,
              }
            : null
        }
      />

      {thisDay.length > 0 && (
        <Reveal>
          <SectionHeading
            eyebrow="Neste dia"
            title="Há alguns anos, hoje"
            description="Fotos tiradas nesta mesma data, em outros anos."
            action={
              <Link href="/galeria" className="text-sm font-medium text-rose-700 hover:underline">
                Ver galeria
              </Link>
            }
          />
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
            {thisDay.slice(0, 4).map((item, index) => (
              <Link key={item.id} href="/galeria" className="w-40 shrink-0 sm:w-auto">
                <Polaroid
                  src={item.url}
                  caption={item.caption ?? new Date(item.taken_at ?? item.created_at).getFullYear().toString()}
                  rotate={index % 2 === 0 ? -2.5 : 2}
                />
              </Link>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  )
}
