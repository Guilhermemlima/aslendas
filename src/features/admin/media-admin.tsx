'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState } from '@/components/ui/misc'
import { Uploader } from '@/features/media/uploader'
import { useToast } from '@/components/ui/toast'
import { deleteAlbum, deleteMedia, saveAlbum, updateMedia } from '@/app/actions/media'
import { formatShortDate } from '@/lib/date'
import type { MediaKind } from '@/types/db'

export interface AdminMedia {
  id: string
  url: string | null
  kind: MediaKind
  caption: string | null
  albumId: string | null
  sizeBytes: number
  takenAt: string
}

export function MediaAdmin({
  items,
  albums,
}: {
  items: AdminMedia[]
  albums: { id: string; title: string }[]
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [albumModal, setAlbumModal] = useState(false)
  const [editing, setEditing] = useState<AdminMedia | null>(null)

  const totalMb = items.reduce((sum, item) => sum + item.sizeBytes, 0) / 1024 / 1024

  return (
    <div className="space-y-6">
      <Uploader label="Enviar fotos, vídeos ou áudio" onUploaded={() => router.refresh()} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="rose">{items.length} arquivos</Badge>
          <Badge tone="neutral">{totalMb.toFixed(1)} MB</Badge>
          <Badge tone="lilac">{albums.length} álbuns</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAlbumModal(true)}>
          <FolderPlus className="h-4 w-4" /> Novo álbum
        </Button>
      </div>

      {albums.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {albums.map((album) => (
            <span
              key={album.id}
              className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3.5 py-1.5 text-sm text-rose-700"
            >
              {album.title}
              <button
                type="button"
                aria-label={`Apagar álbum ${album.title}`}
                onClick={() =>
                  startTransition(async () => {
                    await deleteAlbum(album.id)
                    notify('Álbum removido. Os arquivos continuam na galeria.')
                    router.refresh()
                  })
                }
                className="focus-ring text-rose-400 hover:text-rose-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState emoji="🖼️" title="Nenhum arquivo ainda" description="Envie as primeiras fotos acima." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="group overflow-hidden">
              <button
                type="button"
                onClick={() => setEditing(item)}
                className="focus-ring block aspect-square w-full bg-rose-100"
              >
                {item.kind === 'image' && item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-2xl">
                    {item.kind === 'video' ? '🎬' : '🎵'}
                  </span>
                )}
              </button>
              <CardBody className="flex items-center justify-between gap-2 p-2.5">
                <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                  {item.caption ?? formatShortDate(item.takenAt)}
                </span>
                <button
                  type="button"
                  aria-label="Apagar"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteMedia(item.id)
                      if (result.ok) {
                        notify('Arquivo apagado.')
                        router.refresh()
                      }
                    })
                  }
                  className="focus-ring rounded-full p-1 text-ink-faint hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------ edição ----- */}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Editar arquivo" size="sm">
        {editing && (
          <form
            className="space-y-4"
            action={(formData) => {
              startTransition(async () => {
                const result = await updateMedia(editing.id, {
                  caption: String(formData.get('caption') ?? ''),
                  album_id: (formData.get('album_id') as string) || null,
                  taken_at: String(formData.get('taken_at') ?? '') || null,
                })
                if (result.ok) {
                  notify('Arquivo atualizado.')
                  setEditing(null)
                  router.refresh()
                } else {
                  notify(result.error ?? 'Não consegui salvar.', 'error')
                }
              })
            }}
          >
            {editing.kind === 'image' && editing.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={editing.url} alt="" className="max-h-64 w-full rounded-2xl object-contain" />
            )}

            <Field label="Legenda">
              {(id) => <Input id={id} name="caption" defaultValue={editing.caption ?? ''} maxLength={300} />}
            </Field>

            <Field label="Álbum">
              {(id) => (
                <Select id={id} name="album_id" defaultValue={editing.albumId ?? ''}>
                  <option value="">Sem álbum</option>
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Data da foto">
              {(id) => (
                <Input id={id} name="taken_at" type="date" defaultValue={editing.takenAt.slice(0, 10)} />
              )}
            </Field>

            <Button type="submit" className="w-full" loading={pending}>
              Salvar
            </Button>
          </form>
        )}
      </Modal>

      {/* ------------------------------------------------------ álbum ------ */}
      <Modal open={albumModal} onClose={() => setAlbumModal(false)} title="Novo álbum" size="sm">
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await saveAlbum({
                title: String(formData.get('title') ?? ''),
                description: String(formData.get('description') ?? ''),
              })
              if (result.ok) {
                notify('Álbum criado.')
                setAlbumModal(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui criar.', 'error')
              }
            })
          }}
        >
          <Field label="Nome do álbum" required>
            {(id) => <Input id={id} name="title" required placeholder="Viagem para a praia" />}
          </Field>
          <Field label="Descrição">{(id) => <Input id={id} name="description" maxLength={500} />}</Field>
          <Button type="submit" className="w-full" loading={pending}>
            Criar álbum
          </Button>
        </form>
      </Modal>
    </div>
  )
}
