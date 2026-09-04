'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, GripVertical, Music2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { deleteSong, reorderSongs, saveSong } from '@/app/actions/planning'

export interface SongView {
  id: string
  title: string
  artist: string | null
  url: string | null
  provider: string | null
  reason: string | null
}

export function Playlist({ songs }: { songs: SongView[] }) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [order, setOrder] = useState(songs)
  const [composerOpen, setComposerOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = order.findIndex((song) => song.id === active.id)
    const newIndex = order.findIndex((song) => song.id === over.id)
    const next = arrayMove(order, oldIndex, newIndex)
    setOrder(next)

    startTransition(async () => {
      const result = await reorderSongs(next.map((song) => song.id))
      if (!result.ok) notify('Não consegui salvar a ordem.', 'error')
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar música
        </Button>
      </div>

      {order.length === 0 ? (
        <EmptyState
          emoji="🎧"
          title="A playlist está vazia"
          description="Comece pela música que tocava no primeiro beijo."
          action={<Button onClick={() => setComposerOpen(true)}>Adicionar a primeira</Button>}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order.map((song) => song.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {order.map((song, index) => (
                <SortableSong
                  key={song.id}
                  song={song}
                  index={index}
                  onDelete={() =>
                    startTransition(async () => {
                      await deleteSong(song.id)
                      setOrder((current) => current.filter((item) => item.id !== song.id))
                      router.refresh()
                    })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="Nova música" size="sm">
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await saveSong({
                title: String(formData.get('title') ?? ''),
                artist: String(formData.get('artist') ?? ''),
                url: String(formData.get('url') ?? ''),
                reason: String(formData.get('reason') ?? ''),
              })
              if (result.ok) {
                notify('Música adicionada.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="Nome da música" required>{(id) => <Input id={id} name="title" required />}</Field>
          <Field label="Artista">{(id) => <Input id={id} name="artist" />}</Field>
          <Field label="Link" hint="Spotify, YouTube, Apple Music...">
            {(id) => <Input id={id} name="url" type="url" placeholder="https://" />}
          </Field>
          <Field label="Por que ela é nossa?">
            {(id) => <Textarea id={id} name="reason" className="min-h-[6rem]" />}
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            Adicionar
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function SortableSong({
  song,
  index,
  onDelete,
}: {
  song: SongView
  index: number
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song.id,
  })

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-70 shadow-lift' : undefined}
    >
      <CardBody className="flex items-center gap-3 p-4">
        <button
          type="button"
          className="focus-ring cursor-grab touch-none rounded-lg p-1 text-ink-faint active:cursor-grabbing"
          aria-label="Reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-medium text-rose-700">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{song.title}</p>
          <p className="truncate text-xs text-ink-faint">{song.artist ?? 'Artista desconhecido'}</p>
          {song.reason && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{song.reason}</p>}
        </div>

        {song.provider && <Badge tone="neutral">{song.provider}</Badge>}

        {song.url && (
          <a
            href={song.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Abrir música"
            className="focus-ring rounded-full p-2 text-ink-faint hover:text-rose-700"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        <button
          type="button"
          aria-label="Remover"
          onClick={onDelete}
          className="focus-ring rounded-full p-2 text-ink-faint hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        <Music2 className="hidden h-4 w-4 text-rose-200 sm:block" aria-hidden />
      </CardBody>
    </Card>
  )
}
