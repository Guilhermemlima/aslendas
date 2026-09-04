import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { listAlbums, listMedia } from '@/services/media'
import { MediaAdmin } from '@/features/admin/media-admin'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Mídia · Painel' }

export default async function MediaAdminPage() {
  const { couple } = await requireCouple()
  const [items, albums] = await Promise.all([
    listMedia(couple.id, { limit: 200 }),
    listAlbums(couple.id),
  ])

  return (
    <PageTransition className="space-y-8">
      <Link href="/admin" className="inline-block text-sm text-ink-soft hover:text-rose-700">
        ← Voltar ao painel
      </Link>

      <SectionHeading
        eyebrow="Painel"
        title="Mídia e álbuns"
        description="Envie arquivos, escreva legendas e organize em álbuns. Tudo fica em storage privado."
      />

      <MediaAdmin
        albums={albums.map((album) => ({ id: album.id, title: album.title }))}
        items={items.map((item) => ({
          id: item.id,
          url: item.url,
          kind: item.kind,
          caption: item.caption,
          albumId: item.album_id,
          sizeBytes: item.size_bytes,
          takenAt: item.taken_at ?? item.created_at,
        }))}
      />
    </PageTransition>
  )
}
