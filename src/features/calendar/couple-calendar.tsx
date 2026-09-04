'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/misc'
import { Countdown } from '@/components/motion/countdown'
import { useToast } from '@/components/ui/toast'
import { deleteImportantDate, saveImportantDate } from '@/app/actions/planning'
import { DATE_CATEGORIES } from '@/lib/constants'
import { formatDate, nextOccurrence } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { DateCategory, DateRecurrence } from '@/types/db'

export interface CalendarDate {
  id: string
  title: string
  description: string | null
  date: string
  endDate: string | null
  category: DateCategory
  recurrence: DateRecurrence
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function CoupleCalendar({ dates, anniversary }: { dates: CalendarDate[]; anniversary: string }) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [cursor, setCursor] = useState(() => new Date())
  const [composerOpen, setComposerOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  /** Datas do mês visível, já expandindo as recorrentes para o ano corrente. */
  const monthEvents = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const map = new Map<string, CalendarDate[]>()

    const push = (key: string, item: CalendarDate) => map.set(key, [...(map.get(key) ?? []), item])

    for (const item of dates) {
      const base = new Date(`${item.date}T12:00:00`)
      const occurrence =
        item.recurrence === 'anual' ? new Date(year, base.getMonth(), base.getDate()) : base
      if (occurrence.getFullYear() === year && occurrence.getMonth() === month) {
        push(String(occurrence.getDate()), item)
      }
    }

    // Aniversário de namoro entra automaticamente, sem precisar cadastrar.
    const start = new Date(`${anniversary}T12:00:00`)
    if (start.getMonth() === month) {
      push(String(start.getDate()), {
        id: 'aniversario-namoro',
        title: 'Nosso aniversário de namoro',
        description: null,
        date: anniversary,
        endDate: null,
        category: 'namoro',
        recurrence: 'anual',
      })
    }

    return map
  }, [cursor, dates, anniversary])

  const upcoming = useMemo(() => {
    const now = new Date()
    return dates
      .map((item) => {
        const base = new Date(`${item.date}T12:00:00`)
        const when = item.recurrence === 'anual' ? nextOccurrence(base, now) : base
        return { item, when }
      })
      .filter((entry) => entry.when.getTime() >= now.getTime() - 86_400_000)
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 3)
  }, [dates])

  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth =
    today.getFullYear() === cursor.getFullYear() && today.getMonth() === cursor.getMonth()

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {upcoming.map(({ item, when }) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="h-1 bg-gradient-gold" />
              <CardBody className="space-y-2 p-4">
                <p className="label">{DATE_CATEGORIES[item.category].emoji} {DATE_CATEGORIES[item.category].label}</p>
                <p className="font-display text-lg leading-snug text-ink">{item.title}</p>
                <Countdown target={when} compact />
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardBody className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="focus-ring rounded-full p-2 text-ink-soft hover:bg-rose-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <h2 className="font-display text-xl capitalize text-ink">
              {MONTHS[cursor.getMonth()]} de {cursor.getFullYear()}
            </h2>

            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="focus-ring rounded-full p-2 text-ink-soft hover:bg-rose-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day, index) => (
              <span key={index} className="label py-1">
                {day}
              </span>
            ))}

            {Array.from({ length: firstWeekday }).map((_, index) => (
              <span key={`empty-${index}`} />
            ))}

            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
              const events = monthEvents.get(String(day)) ?? []
              const isToday = isCurrentMonth && today.getDate() === day

              return (
                <motion.button
                  key={day}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() =>
                    setSelectedDay(
                      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                    )
                  }
                  className={cn(
                    'focus-ring relative aspect-square rounded-xl text-sm transition-colors',
                    isToday ? 'bg-rose-500 font-medium text-white' : 'text-ink hover:bg-rose-50',
                    events.length > 0 && !isToday && 'bg-rose-50/70 font-medium',
                  )}
                >
                  {day}
                  {events.length > 0 && (
                    <span className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
                      {events.slice(0, 3).map((event, index) => (
                        <span
                          key={index}
                          className={cn('h-1 w-1 rounded-full', isToday ? 'bg-white' : 'bg-rose-400')}
                        />
                      ))}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" /> Nova data
        </Button>
      </div>

      {/* -------------------------------------------------- dia selecionado */}
      <Modal
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? formatDate(`${selectedDay}T12:00:00`) : undefined}
        size="sm"
      >
        {selectedDay && (
          <div className="space-y-3">
            {(monthEvents.get(String(Number(selectedDay.slice(-2)))) ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl bg-rose-50/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {DATE_CATEGORIES[item.category].emoji} {item.title}
                    </p>
                    {item.description && <p className="mt-1 text-sm text-ink-soft">{item.description}</p>}
                    {item.recurrence === 'anual' && (
                      <Badge tone="lilac" className="mt-2">
                        todo ano
                      </Badge>
                    )}
                  </div>
                  {item.id !== 'aniversario-namoro' && (
                    <button
                      type="button"
                      aria-label="Remover data"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteImportantDate(item.id)
                          setSelectedDay(null)
                          router.refresh()
                        })
                      }
                      className="focus-ring rounded-full p-1.5 text-ink-faint hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {(monthEvents.get(String(Number(selectedDay.slice(-2)))) ?? []).length === 0 && (
              <p className="py-4 text-center text-sm text-ink-soft">Nada marcado nesse dia.</p>
            )}
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------- composer -- */}
      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="Nova data" size="sm">
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const result = await saveImportantDate({
                title: String(formData.get('title') ?? ''),
                description: String(formData.get('description') ?? ''),
                date: String(formData.get('date') ?? ''),
                end_date: String(formData.get('end_date') ?? ''),
                recurrence: (formData.get('recurrence') as DateRecurrence) ?? 'nenhuma',
                category: (formData.get('category') as DateCategory) ?? 'evento',
                color: '',
                notify_days_before: [7, 1],
              })
              if (result.ok) {
                notify('Data marcada.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="Título" required>
            {(id) => <Input id={id} name="title" required placeholder="Aniversário dela" />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" required>{(id) => <Input id={id} name="date" type="date" required />}</Field>
            <Field label="Termina em">{(id) => <Input id={id} name="end_date" type="date" />}</Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              {(id) => (
                <Select id={id} name="category" defaultValue="evento">
                  {Object.entries(DATE_CATEGORIES).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.emoji} {meta.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Repete">
              {(id) => (
                <Select id={id} name="recurrence" defaultValue="anual">
                  <option value="nenhuma">Não repete</option>
                  <option value="anual">Todo ano</option>
                  <option value="mensal">Todo mês</option>
                </Select>
              )}
            </Field>
          </div>
          <Field label="Detalhes">{(id) => <Textarea id={id} name="description" className="min-h-[5rem]" />}</Field>
          <Button type="submit" className="w-full" loading={pending}>
            Salvar
          </Button>
        </form>
      </Modal>
    </div>
  )
}
