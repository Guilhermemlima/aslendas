import { requireCouple } from '@/services/session'
import { listSongs } from '@/services/content'
import { Playlist } from '@/features/playlist/playlist'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Playlist · Nosso Universo' }

export default async function PlaylistPage() {
  const { couple } = await requireCouple()
  const songs = await listSongs(couple.id)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="A trilha sonora de nós dois"
        title="Playlist"
        description="Cada música com o motivo pelo qual ela entrou aqui."
      />

      <Playlist
        songs={songs.map((song) => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          url: song.url,
          provider: song.provider,
          reason: song.reason,
        }))}
      />
    </PageTransition>
  )
}
