import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { listLocations, listMemories, listSongs } from '@/services/content'
import { MemoriesAdmin } from '@/features/admin/memories-admin'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Memórias · Painel' }

export default async function MemoriesAdminPage() {
  const { couple } = await requireCouple()
  const [memories, locations, songs] = await Promise.all([
    listMemories(couple.id, { limit: 200 }),
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
        title="Memórias"
        description="O acervo que alimenta a memória aleatória da Home e o jogo Adivinhe a Memória."
      />

      <MemoriesAdmin
        memories={memories.map((memory) => ({
          id: memory.id,
          title: memory.title,
          description: memory.description,
          happenedOn: memory.happened_on,
          emoji: memory.emoji,
          tags: memory.tags,
          isFavorite: memory.is_favorite,
          locationId: memory.location_id,
          songId: memory.song_id,
          mediaIds: memory.media.map((item) => item.id),
          coverUrl: memory.cover?.url ?? null,
        }))}
        locations={locations.map((location) => ({ id: location.id, name: location.name }))}
        songs={songs.map((song) => ({ id: song.id, title: song.title }))}
      />
    </PageTransition>
  )
}
