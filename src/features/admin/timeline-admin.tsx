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
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select, TagInput, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState } from '@/components/ui/misc'
import { Uploader, type UploadedItem } from '@/features/media/uploader'
import { useToast } from '@/components/ui/toast'
import { deleteTimelineEvent, reorderTimeline, saveTimelineEvent } from '@/app/actions/memories'
import { TIMELINE_CATEGORIES } from '@/lib/constants'
import { formatShortDate } from '@/lib/date'
import type { TimelineCategory } from '@/types/db'

export interface AdminEvent {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  category: TimelineCategory
  emoji: string | null
  tags: string[]
  isHighlight: boolean
  locationId: string | null
  songId: string | null
  mediaIds: string[]
  coverUrl: string | null
}

export function TimelineAdmin({
  events,
  locations,
  songs,
}: {
  events: AdminEvent[]
  locations: { id: string; name: string }[]
  songs: { id: string; title: string }[]
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [order, setOrder] = useState(events)
  const [editing, setEditing] = useState<AdminEvent | null>(null)
  const [creating, setCreating] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [newMedia, setNewMedia] = useState<UploadedItem[]>([])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const next = arrayMove(
      order,
      order.findIndex((item) => item.id === active.id),
      order.findIndex((item) => item.id === over.id),
    )
    setOrder(next)

    startTransition(async () => {
      const result = await reorderTimeline(next.map((item) => item.id))
      if (!result.ok) notify('Não consegui salvar a ordem.', 'error')
    })
  }

  function openEditor(event: AdminEvent | null) {
    setEditing(event)
    setCreating(event === null)
    setTags(event?.tags ?? [])
    setNewMedia([])
  }

  const modalOpen = creating || Boolean(editing)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => openEditor(null)}>
          <Plus className="h-4 w-4" /> Novo momento
        </Button>
      </div>

      {order.length === 0 ? (
        <EmptyState
          emoji="🧭"
          title="A linha do tempo está vazia"
          description="Comece pelo primeiro encontro."
          action={<Button onClick={() => openEditor(null)}>Criar o primeiro</Button>}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {order.map((event) => (
                <SortableRow
                  key={event.id}
                  event={event}
                  onEdit={() => openEditor(event)}
                  onDelete={() =>
                    startTransition(async () => {
                      const result = await deleteTimelineEvent(event.id)
                      if (result.ok) {
                        setOrder((current) => current.filter((item) => item.id !== event.id))
                        notify('Momento removido.')
                        router.refresh()
                      }
                    })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setEditing(null)
          setCreating(false)
        }}
        title={editing ? 'Editar momento' : 'Novo momento'}
        size="md"
      >
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await saveTimelineEvent({
                id: editing?.id,
                title: String(formData.get('title') ?? ''),
                description: String(formData.get('description') ?? ''),
                event_date: String(formData.get('event_date') ?? ''),
                event_time: String(formData.get('event_time') ?? ''),
                category: (formData.get('category') as TimelineCategory) ?? 'outro',
                emoji: String(formData.get('emoji') ?? ''),
                tags,
                is_highlight: formData.get('is_highlight') === 'on',
                location_id: (formData.get('location_id') as string) || null,
                song_id: (formData.get('song_id') as string) || null,
                mediaIds: [...(editing?.mediaIds ?? []), ...newMedia.map((item) => item.id)],
              })

              if (result.ok) {
                notify('Momento salvo.')
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
            {(id) => <Input id={id} name="title" required defaultValue={editing?.title} placeholder="Primeiro encontro" />}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" required>
              {(id) => <Input id={id} name="event_date" type="date" required defaultValue={editing?.date} />}
            </Field>
            <Field label="Hora">
              {(id) => <Input id={id} name="event_time" type="time" defaultValue={editing?.time?.slice(0, 5) ?? ''} />}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              {(id) => (
                <Select id={id} name="category" defaultValue={editing?.category ?? 'outro'}>
                  {Object.entries(TIMELINE_CATEGORIES).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.emoji} {meta.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Emoji">
              {(id) => <Input id={id} name="emoji" maxLength={4} defaultValue={editing?.emoji ?? ''} />}
            </Field>
          </div>

          <Field label="Descrição">
            {(id) => (
              <Textarea id={id} name="description" defaultValue={editing?.description ?? ''} className="min-h-[8rem]" />
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
            <input type="checkbox" name="is_highlight" defaultChecked={editing?.isHighlight} />
            Marcar como destaque
          </label>

          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Salvar momento
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function SortableRow({
  event,
  onEdit,
  onDelete,
}: {
  event: AdminEvent
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
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

        {event.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-lg">
            {event.emoji ?? TIMELINE_CATEGORIES[event.category].emoji}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{event.title}</p>
          <p className="text-xs text-ink-faint">
            {formatShortDate(`${event.date}T12:00:00`)} · {TIMELINE_CATEGORIES[event.category].label}
          </p>
        </div>

        {event.isHighlight && (
          <Badge tone="gold">
            <Star className="h-3 w-3 fill-current" /> destaque
          </Badge>
        )}

        <button
          type="button"
          aria-label="Editar"
          onClick={onEdit}
          className="focus-ring rounded-full p-2 text-ink-faint hover:text-ink"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Apagar"
          onClick={onDelete}
          className="focus-ring rounded-full p-2 text-ink-faint hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </CardBody>
    </Card>
  )
}
