import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { listLocations, listSongs, listTimeline } from '@/services/content'
import { TimelineAdmin } from '@/features/admin/timeline-admin'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Linha do tempo · Painel' }

export default async function TimelineAdminPage() {
  const { couple } = await requireCouple()
  const [events, locations, songs] = await Promise.all([
    listTimeline(couple.id),
    listLocations(couple.id),
    listSongs(couple.id),
  ])

  return (
    <PageTransition className="space-y-8">
      <Link href="/admin" className="inline-block text-sm text-ink-soft hover:text-rose-700">
        ← Voltar ao painel
      </Link>

      <SectionHeading
        eyebrow="Painel"
        title="Linha do tempo"
        description="Arraste para reordenar dentro do mesmo dia. A ordem vale para a página Nossa História."
      />

      <TimelineAdmin
        events={events.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.event_date,
          time: event.event_time,
          category: event.category,
          emoji: event.emoji,
          tags: event.tags,
          isHighlight: event.is_highlight,
          locationId: event.location_id,
          songId: event.song_id,
          mediaIds: event.media.map((item) => item.id),
          coverUrl: event.media[0]?.url ?? null,
        }))}
        locations={locations.map((location) => ({ id: location.id, name: location.name }))}
        songs={songs.map((song) => ({ id: song.id, title: song.title }))}
      />
    </PageTransition>
  )
}
