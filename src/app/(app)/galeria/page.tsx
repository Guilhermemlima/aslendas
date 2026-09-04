import { requireCouple } from '@/services/session'
import { listAlbums, listMedia, listTags, listYears, onThisDay } from '@/services/media'
import { Gallery } from '@/features/gallery/gallery'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Galeria · Nosso Universo' }

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ album?: string; ano?: string; tag?: string; favoritos?: string; aleatoria?: string }>
}) {
  const params = await searchParams
  const { couple } = await requireCouple()

  const [items, albums, years, tags, thisDay] = await Promise.all([
    listMedia(couple.id, {
      albumId: params.album ?? null,
      year: params.ano ? Number(params.ano) : undefined,
      tag: params.tag,
      favoritesOnly: params.favoritos === '1',
      limit: 300,
    }),
    listAlbums(couple.id),
    listYears(couple.id),
    listTags(couple.id),
    onThisDay(couple.id),
  ])

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Nossas fotos e vídeos"
        title="Galeria"
        description="Tudo o que vocês registraram, organizado por álbum, ano e tag."
      />

      <Gallery
        items={items.map((item) => ({
          id: item.id,
          url: item.url,
          kind: item.kind,
          caption: item.caption,
          takenAt: item.taken_at ?? item.created_at,
          isFavorite: item.is_favorite,
          tags: item.tags,
          albumId: item.album_id,
        }))}
        albums={albums.map((album) => ({ id: album.id, title: album.title }))}
        years={years}
        tags={tags}
        thisDay={thisDay.map((item) => ({
          id: item.id,
          url: item.url,
          caption: item.caption,
          year: new Date(item.taken_at ?? item.created_at).getFullYear(),
        }))}
        openRandomOnLoad={params.aleatoria === '1'}
        activeFilters={{
          album: params.album ?? null,
          year: params.ano ? Number(params.ano) : null,
          tag: params.tag ?? null,
          favorites: params.favoritos === '1',
        }}
      />
    </PageTransition>
  )
}
