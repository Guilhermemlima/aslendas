import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { listTimeline } from '@/services/content'
import { Timeline } from '@/features/timeline/timeline'
import { EmptyState, SectionHeading } from '@/components/ui/misc'
import { ButtonLink } from '@/components/ui/button'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Nossa História · Nosso Universo' }

export default async function HistoryPage() {
  const { couple } = await requireCouple()
  const events = await listTimeline(couple.id)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Linha do tempo"
        title="Nossa História"
        description="Cada acontecimento que valeu a pena guardar, em ordem."
        action={
          <ButtonLink href="/admin/timeline" variant="outline" size="sm">
            Adicionar momento
          </ButtonLink>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="A história começa com o primeiro registro"
          description="Adicione o primeiro encontro, a primeira conversa ou aquele dia que mudou tudo."
          action={
            <ButtonLink href="/admin/timeline">Criar o primeiro momento</ButtonLink>
          }
        />
      ) : (
        <Timeline
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
            locationName: event.location?.name ?? null,
            song: event.song ? { title: event.song.title, artist: event.song.artist, url: event.song.url } : null,
            media: event.media.map((item) => ({
              id: item.id,
              url: item.url,
              kind: item.kind,
              caption: item.caption,
            })),
          }))}
        />
      )}

      <p className="text-center text-sm text-ink-faint">
        Quer reordenar os momentos?{' '}
        <Link href="/admin/timeline" className="font-medium text-rose-700 hover:underline">
          Abrir o painel
        </Link>
      </p>
    </PageTransition>
  )
}
