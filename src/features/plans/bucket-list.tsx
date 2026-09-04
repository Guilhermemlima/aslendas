'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState, Progress } from '@/components/ui/misc'
import { Confetti } from '@/components/motion/confetti'
import { useToast } from '@/components/ui/toast'
import { deleteBucketItem, saveBucketItem, setBucketStatus } from '@/app/actions/planning'
import { formatShortDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { BucketStatus } from '@/types/db'

export interface BucketItemView {
  id: string
  title: string
  description: string | null
  category: string
  status: BucketStatus
  priority: number
  targetDate: string | null
  completedAt: string | null
}

const COLUMNS: { status: BucketStatus; label: string; emoji: string }[] = [
  { status: 'quero', label: 'Queremos fazer', emoji: '💭' },
  { status: 'planejado', label: 'Já planejado', emoji: '📌' },
  { status: 'concluido', label: 'Concluído', emoji: '🏆' },
]

export function BucketList({ items }: { items: BucketItemView[] }) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [composerOpen, setComposerOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const done = items.filter((item) => item.status === 'concluido').length
  const grouped = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        items: items.filter((item) => item.status === column.status),
      })),
    [items],
  )

  function move(item: BucketItemView, status: BucketStatus) {
    startTransition(async () => {
      const result = await setBucketStatus(item.id, status)
      if (!result.ok) {
        notify(result.error ?? 'Não consegui atualizar.', 'error')
        return
      }
      if (status === 'concluido') {
        setCelebrate(true)
        notify('Mais um sonho realizado 💛')
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <Confetti active={celebrate} onDone={() => setCelebrate(false)} />

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-[12rem] flex-1">
            <p className="label mb-2">
              {done} de {items.length} realizados
            </p>
            <Progress value={items.length ? done / items.length : 0} />
          </div>
          <Button onClick={() => setComposerOpen(true)}>
            <Plus className="h-4 w-4" /> Novo sonho
          </Button>
        </CardBody>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          emoji="⭐"
          title="A lista está vazia"
          description="Anote aquele lugar, aquele filme, aquela comida — tudo que vocês querem fazer juntos."
          action={<Button onClick={() => setComposerOpen(true)}>Adicionar o primeiro</Button>}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {grouped.map((column) => (
            <div key={column.status} className="space-y-3">
              <h2 className="flex items-center gap-2 px-1 font-display text-lg text-ink">
                <span aria-hidden>{column.emoji}</span>
                {column.label}
                <span className="text-sm text-ink-faint">{column.items.length}</span>
              </h2>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {column.items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                    >
                      <Card className={cn('group', item.status === 'concluido' && 'opacity-90')}>
                        <CardBody className="space-y-2 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={cn(
                                'font-medium text-ink',
                                item.status === 'concluido' && 'text-ink-soft line-through',
                              )}
                            >
                              {item.title}
                            </h3>
                            <button
                              type="button"
                              aria-label="Remover"
                              onClick={() =>
                                startTransition(async () => {
                                  await deleteBucketItem(item.id)
                                  router.refresh()
                                })
                              }
                              className="focus-ring shrink-0 rounded-full p-1 text-ink-faint opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {item.description && (
                            <p className="text-sm leading-relaxed text-ink-soft">{item.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="neutral">{item.category}</Badge>
                            {item.targetDate && (
                              <Badge tone="lilac">{formatShortDate(`${item.targetDate}T12:00:00`)}</Badge>
                            )}
                            {item.completedAt && <Badge tone="gold">✓ {formatShortDate(item.completedAt)}</Badge>}
                          </div>

                          {item.status !== 'concluido' && (
                            <div className="flex gap-2 pt-1">
                              {item.status === 'quero' && (
                                <Button size="sm" variant="outline" onClick={() => move(item, 'planejado')} disabled={pending}>
                                  Planejar
                                </Button>
                              )}
                              <Button size="sm" variant="secondary" onClick={() => move(item, 'concluido')} disabled={pending}>
                                <Check className="h-3.5 w-3.5" /> Concluir
                              </Button>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="Novo sonho" size="sm">
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await saveBucketItem({
                title: String(formData.get('title') ?? ''),
                description: String(formData.get('description') ?? ''),
                category: String(formData.get('category') ?? 'geral'),
                status: 'quero',
                priority: Number(formData.get('priority') ?? 2),
                target_date: String(formData.get('target_date') ?? ''),
              })
              if (result.ok) {
                notify('Sonho anotado.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="O que vocês querem fazer?" required>
            {(id) => <Input id={id} name="title" required placeholder="Ver a aurora boreal" />}
          </Field>
          <Field label="Detalhes">
            {(id) => <Textarea id={id} name="description" className="min-h-[5rem]" />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              {(id) => (
                <Select id={id} name="category" defaultValue="viagem">
                  <option value="viagem">Viagem</option>
                  <option value="restaurante">Restaurante</option>
                  <option value="filme">Filme ou série</option>
                  <option value="atividade">Atividade</option>
                  <option value="compra">Compra</option>
                  <option value="geral">Geral</option>
                </Select>
              )}
            </Field>
            <Field label="Prioridade">
              {(id) => (
                <Select id={id} name="priority" defaultValue="2">
                  <option value="1">Alta</option>
                  <option value="2">Média</option>
                  <option value="3">Um dia</option>
                </Select>
              )}
            </Field>
          </div>
          <Field label="Data alvo">{(id) => <Input id={id} name="target_date" type="date" />}</Field>
          <Button type="submit" className="w-full" loading={pending}>
            Adicionar
          </Button>
        </form>
      </Modal>
    </div>
  )
}
