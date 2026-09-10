import { requireCouple } from '@/services/session'
import { listWatchlist } from '@/services/watchlist'
import { WatchlistBoard } from '@/features/watchlist/watchlist-board'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Para Assistir · Nosso Universo' }

export default async function AssistirPage() {
  const { couple, me, partner } = await requireCouple()
  const items = await listWatchlist(couple.id)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="A fila de vocês"
        title="Para Assistir"
        description="Filmes e séries que ficaram de ver — e o sorteio para as noites sem decisão."
      />

      <WatchlistBoard
        meId={me.id}
        meName={me.display_name}
        partnerName={partner?.display_name ?? null}
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          kind: item.kind,
          status: item.status,
          platform: item.platform,
          genre: item.genre,
          year: item.year,
          note: item.note,
          season: item.season,
          episode: item.episode,
          watchedOn: item.watched_on,
          ratings: item.ratings.map((r) => ({
            userId: r.user_id,
            rating: r.rating,
            comment: r.comment,
          })),
        }))}
      />
    </PageTransition>
  )
}
