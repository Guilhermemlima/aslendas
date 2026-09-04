'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { deleteQuestion, saveQuestion, setQuestionActive } from '@/app/actions/games'
import { INTENSITY } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { IntensityLevel } from '@/types/db'

export interface AdminQuestion {
  id: string
  content: string
  options: string[]
  category: string | null
  intensity: IntensityLevel
  isActive: boolean
  isGlobal: boolean
}

export function QuestionsAdmin({
  games,
  selectedSlug,
  questions,
}: {
  games: { slug: string; name: string; isIntimate: boolean }[]
  selectedSlug: string
  questions: AdminQuestion[]
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [composerOpen, setComposerOpen] = useState(false)

  const own = questions.filter((question) => !question.isGlobal)
  const global = questions.filter((question) => question.isGlobal)

  return (
    <div className="space-y-6">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {games.map((game) => (
          <button
            key={game.slug}
            type="button"
            onClick={() => router.push(`/admin/jogos?jogo=${game.slug}`)}
            className={cn(
              'focus-ring shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              selectedSlug === game.slug
                ? 'border-rose-300 bg-rose-100 font-medium text-rose-700'
                : 'border-line bg-surface/60 text-ink-soft hover:border-rose-300',
            )}
          >
            {game.isIntimate && '🔒 '}
            {game.name}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" /> Nova pergunta
        </Button>
      </div>

      {own.length > 0 && (
        <section className="space-y-3">
          <h2 className="label">Perguntas de vocês ({own.length})</h2>
          {own.map((question) => (
            <QuestionRow
              key={question.id}
              question={question}
              pending={pending}
              onToggle={(active) =>
                startTransition(async () => {
                  await setQuestionActive(question.id, active)
                  router.refresh()
                })
              }
              onDelete={() =>
                startTransition(async () => {
                  await deleteQuestion(question.id)
                  notify('Pergunta removida.')
                  router.refresh()
                })
              }
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="label">Banco padrão ({global.length})</h2>
        <p className="text-sm text-ink-soft">
          Estas vêm prontas com o sistema e são compartilhadas por todos os casais — por isso não dá
          para editá-las. Crie a sua versão se quiser algo diferente.
        </p>
        {global.map((question) => (
          <Card key={question.id}>
            <CardBody className="flex items-start justify-between gap-3 p-4">
              <p className="text-sm text-ink">{question.content}</p>
              <Badge tone="neutral">{INTENSITY[question.intensity].label}</Badge>
            </CardBody>
          </Card>
        ))}
      </section>

      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="Nova pergunta" size="sm">
        <form
          className="space-y-4"
          action={(formData) => {
            const rawOptions = String(formData.get('options') ?? '')
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)

            startTransition(async () => {
              const result = await saveQuestion({
                gameSlug: selectedSlug,
                content: String(formData.get('content') ?? ''),
                options: rawOptions,
                category: String(formData.get('category') ?? ''),
                intensity: (formData.get('intensity') as IntensityLevel) ?? 'leve',
              })

              if (result.ok) {
                notify('Pergunta criada.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(result.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="Pergunta" required>
            {(id) => <Textarea id={id} name="content" required className="min-h-[6rem]" />}
          </Field>
          <Field label="Opções" hint="Uma por linha. Deixe vazio para resposta livre.">
            {(id) => <Textarea id={id} name="options" className="min-h-[5rem]" />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">{(id) => <Input id={id} name="category" maxLength={40} />}</Field>
            <Field label="Intensidade">
              {(id) => (
                <Select id={id} name="intensity" defaultValue="leve">
                  {(Object.keys(INTENSITY) as IntensityLevel[]).map((level) => (
                    <option key={level} value={level}>
                      {INTENSITY[level].label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <Button type="submit" className="w-full" loading={pending}>
            Criar pergunta
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function QuestionRow({
  question,
  pending,
  onToggle,
  onDelete,
}: {
  question: AdminQuestion
  pending: boolean
  onToggle: (active: boolean) => void
  onDelete: () => void
}) {
  return (
    <Card>
      <CardBody className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm text-ink', !question.isActive && 'text-ink-faint line-through')}>
            {question.content}
          </p>
          {question.options.length > 0 && (
            <p className="mt-1 text-xs text-ink-faint">{question.options.join(' · ')}</p>
          )}
          <div className="mt-2">
            <Switch
              label={question.isActive ? 'Ativa' : 'Desativada'}
              checked={question.isActive}
              disabled={pending}
              onChange={onToggle}
            />
          </div>
        </div>
        <button
          type="button"
          aria-label="Apagar"
          onClick={onDelete}
          className="focus-ring shrink-0 rounded-full p-2 text-ink-faint hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </CardBody>
    </Card>
  )
}
