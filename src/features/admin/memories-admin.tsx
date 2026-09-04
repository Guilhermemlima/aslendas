'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select, TagInput, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/misc'
import { Uploader, type UploadedItem } from '@/features/media/uploader'
import { useToast } from '@/components/ui/toast'
import { deleteMemory, saveMemory, toggleMemoryFavorite } from '@/app/actions/memories'
import { formatShortDate } from '@/lib/date'
import { cn } from '@/lib/utils'

export interface AdminMemory {
  id: string
  title: string
  description: string | null
  happenedOn: string | null
  emoji: string | null
  tags: string[]
  isFavorite: boolean
  locationId: string | null
  songId: string | null
  mediaIds: string[]
  coverUrl: string | null
}

export function MemoriesAdmin({
  memories,
  locations,
  songs,
}: {
  memories: AdminMemory[]
  locations: { id: string; name: string }[]
  songs: { id: string; title: string }[]
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<AdminMemory | null>(null)
  const [creating, setCreating] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [newMedia, setNewMedia] = useState<UploadedItem[]>([])

  function openEditor(memory: AdminMemory | null) {
    setEditing(memory)
    setCreating(memory === null)
    setTags(memory?.tags ?? [])
    setNewMedia([])
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => openEditor(null)}>
          <Plus className="h-4 w-4" /> Nova memória
        </Button>
      </div>

      {memories.length === 0 ? (
        <EmptyState
          emoji="💭"
          title="Nenhuma memória guardada"
          description="Guarde um momento com texto e fotos. Ele volta sozinho na Home um dia."
          action={<Button onClick={() => openEditor(null)}>Guardar a primeira</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory) => (
            <Card key={memory.id} className="group overflow-hidden" hover>
              {memory.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={memory.coverUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              )}
              <CardBody className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-ink">
                      {memory.emoji ? `${memory.emoji} ` : ''}
                      {memory.title}
                    </h3>
                    {memory.happenedOn && (
                      <p className="text-xs text-ink-faint">
                        {formatShortDate(`${memory.happenedOn}T12:00:00`)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label="Favoritar"
                    onClick={() =>
                      startTransition(async () => {
                        await toggleMemoryFavorite(memory.id, !memory.isFavorite)
                        router.refresh()
                      })
                    }
                    className="focus-ring shrink-0 rounded-full p-1"
                  >
                    <Heart
                      className={cn(
                        'h-4 w-4',
                        memory.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-ink-faint',
                      )}
                    />
                  </button>
                </div>

                {memory.description && (
                  <p className="line-clamp-2 text-sm text-ink-soft">{memory.description}</p>
                )}

                <div className="flex gap-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="ghost" onClick={() => openEditor(memory)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteMemory(memory.id)
                        notify('Memória removida.')
                        router.refresh()
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
        title={editing ? 'Editar memória' : 'Nova memória'}
        size="md"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await saveMemory({
                id: editing?.id,
                title: String(formData.get('title') ?? ''),
                description: String(formData.get('description') ?? ''),
                happened_on: String(formData.get('happened_on') ?? ''),
                emoji: String(formData.get('emoji') ?? ''),
                tags,
                is_favorite: formData.get('is_favorite') === 'on',
                location_id: (formData.get('location_id') as string) || null,
                song_id: (formData.get('song_id') as string) || null,
                mediaIds: [...(editing?.mediaIds ?? []), ...newMedia.map((item) => item.id)],
              })

              if (result.ok) {
                notify('Memória salva.')
                setEditing(null)
                setCreating(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="Título" required>
            {(id) => <Input id={id} name="title" required defaultValue={editing?.title} />}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quando foi">
              {(id) => <Input id={id} name="happened_on" type="date" defaultValue={editing?.happenedOn ?? ''} />}
            </Field>
            <Field label="Emoji">
              {(id) => <Input id={id} name="emoji" maxLength={4} defaultValue={editing?.emoji ?? ''} />}
            </Field>
          </div>

          <Field label="O que aconteceu">
            {(id) => (
              <Textarea id={id} name="description" defaultValue={editing?.description ?? ''} className="min-h-[9rem]" />
            )}
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Lugar">
              {(id) => (
                <Select id={id} name="location_id" defaultValue={editing?.locationId ?? ''}>
                  <option value="">Nenhum</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Música">
              {(id) => (
                <Select id={id} name="song_id" defaultValue={editing?.songId ?? ''}>
                  <option value="">Nenhuma</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label="Tags">{() => <TagInput value={tags} onChange={setTags} />}</Field>

          <Field label="Fotos e vídeos">
            {() => <Uploader onUploaded={(items) => setNewMedia((current) => [...current, ...items])} />}
          </Field>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="is_favorite" defaultChecked={editing?.isFavorite} />
            Marcar como favorita
          </label>

          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Salvar memória
          </Button>
        </form>
      </Modal>
    </div>
  )
}
