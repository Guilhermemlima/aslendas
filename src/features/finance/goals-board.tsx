'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, PauseCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Badge, EmptyState, Progress } from '@/components/ui/misc'
import { Confetti } from '@/components/motion/confetti'
import { Reveal } from '@/components/motion/reveal'
import { useToast } from '@/components/ui/toast'
import { deleteGoal, saveGoal, setGoalStatus } from '@/app/actions/finance'
import { GoalDetail, type ContributionView, type GoalView } from '@/features/finance/goal-detail'
import { formatarBRL, planejarMeta } from '@/lib/finance'
import { formatShortDate } from '@/lib/date'
import { cn } from '@/lib/utils'

const CATEGORIAS = [
  { value: 'viagem', label: 'Viagem', emoji: '✈️' },
  { value: 'casa', label: 'Casa', emoji: '🏡' },
  { value: 'presente', label: 'Presente', emoji: '🎁' },
  { value: 'experiencia', label: 'Experiência', emoji: '🎟️' },
  { value: 'reserva', label: 'Reserva', emoji: '🛟' },
  { value: 'outro', label: 'Outro', emoji: '⭐' },
]

export function GoalsBoard({
  goals,
  contributionsByGoal,
}: {
  goals: GoalView[]
  contributionsByGoal: Record<string, ContributionView[]>
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [composerOpen, setComposerOpen] = useState(false)
  const [aberta, setAberta] = useState<string | null>(null)
  const [celebrate, setCelebrate] = useState(false)

  const ativas = goals.filter((g) => g.status === 'ativa')
  const outras = goals.filter((g) => g.status !== 'ativa')
  const metaAberta = goals.find((g) => g.id === aberta) ?? null

  const totalGuardado = goals.reduce((soma, g) => soma + g.savedCents, 0)

  function concluir(goal: GoalView) {
    startTransition(async () => {
      const r = await setGoalStatus(goal.id, 'concluida')
      if (r.ok) {
        setCelebrate(true)
        notify('Meta concluída 🎉')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <Confetti active={celebrate} onDone={() => setCelebrate(false)} />

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="label mb-1">Guardado no total</p>
            <p className="font-display text-3xl text-ink">{formatarBRL(totalGuardado)}</p>
            <p className="text-xs text-ink-faint">
              em {goals.length} {goals.length === 1 ? 'meta' : 'metas'}
            </p>
          </div>
          <Button onClick={() => setComposerOpen(true)}>
            <Plus className="h-4 w-4" /> Nova meta
          </Button>
        </CardBody>
      </Card>

      {goals.length === 0 ? (
        <EmptyState
          emoji="🐷"
          title="Nenhuma meta ainda"
          description="Crie a primeira: uma viagem, um presente, uma reserva. O app calcula quanto guardar por mês."
          action={<Button onClick={() => setComposerOpen(true)}>Criar meta</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...ativas, ...outras].map((goal, index) => {
            const plano = planejarMeta({
              alvoCents: goal.targetCents,
              guardadoCents: goal.savedCents,
              dataAlvo: goal.targetDate,
            })
            const categoria = CATEGORIAS.find((c) => c.value === goal.category)

            return (
              <Reveal key={goal.id} delay={index * 0.04}>
                <Card hover className={cn('h-full', goal.status !== 'ativa' && 'opacity-75')}>
                  <CardBody className="space-y-3 p-5">
                    <button
                      type="button"
                      onClick={() => setAberta(goal.id)}
                      className="focus-ring w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-display text-xl text-ink">
                            <span className="font-emoji">{goal.emoji || categoria?.emoji}</span>{' '}
                            {goal.title}
                          </h3>
                          {goal.targetDate && (
                            <p className="text-xs text-ink-faint">
                              para {formatShortDate(`${goal.targetDate}T12:00:00`)}
                            </p>
                          )}
                        </div>
                        {goal.status === 'concluida' && <Badge tone="gold">concluída</Badge>}
                        {goal.status === 'pausada' && <Badge tone="neutral">pausada</Badge>}
                      </div>

                      <div className="mt-3 flex items-baseline justify-between gap-2">
                        <span className="font-display text-lg text-ink">
                          {formatarBRL(goal.savedCents)}
                        </span>
                        <span className="text-xs text-ink-soft">
                          de {formatarBRL(goal.targetCents)}
                        </span>
                      </div>

                      <Progress value={plano.progresso} className="mt-2" />

                      {plano.porMesCents !== null && !plano.concluida && (
                        <p className="mt-2 text-sm text-rose-700">
                          {formatarBRL(plano.porMesCents)} por mês para chegar na data
                        </p>
                      )}
                      {plano.concluida && goal.status === 'ativa' && (
                        <p className="mt-2 text-sm text-gold">Valor alcançado 🎉</p>
                      )}
                    </button>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {goal.status === 'ativa' && plano.concluida && (
                        <Button size="sm" variant="gold" onClick={() => concluir(goal)} disabled={pending}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                        </Button>
                      )}
                      {goal.status === 'ativa' && !plano.concluida && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await setGoalStatus(goal.id, 'pausada')
                              router.refresh()
                            })
                          }
                        >
                          <PauseCircle className="h-3.5 w-3.5" /> Pausar
                        </Button>
                      )}
                      {goal.status === 'pausada' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await setGoalStatus(goal.id, 'ativa')
                              router.refresh()
                            })
                          }
                        >
                          Retomar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await deleteGoal(goal.id)
                            notify('Meta removida.')
                            router.refresh()
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </Reveal>
            )
          })}
        </div>
      )}

      {/* ------------------------------------------------------- detalhe --- */}
      <Modal
        open={Boolean(metaAberta)}
        onClose={() => setAberta(null)}
        title={metaAberta?.title}
        description={metaAberta?.description ?? undefined}
        size="md"
      >
        {metaAberta && (
          <GoalDetail goal={metaAberta} contributions={contributionsByGoal[metaAberta.id] ?? []} />
        )}
      </Modal>

      {/* ------------------------------------------------------ composer --- */}
      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="Nova meta" size="sm">
        <form
          className="space-y-4"
          action={(formData) => {
            startTransition(async () => {
              const resultado = await saveGoal({
                title: String(formData.get('title') ?? ''),
                description: String(formData.get('description') ?? ''),
                emoji: String(formData.get('emoji') ?? ''),
                category: String(formData.get('category') ?? 'viagem'),
                targetRaw: String(formData.get('target') ?? ''),
                targetDate: String(formData.get('target_date') ?? ''),
              })
              if (resultado.ok) {
                notify('Meta criada.')
                setComposerOpen(false)
                router.refresh()
              } else {
                notify(resultado.error ?? 'Não consegui salvar.', 'error')
              }
            })
          }}
        >
          <Field label="O que vocês querem?" required>
            {(id) => <Input id={id} name="title" required placeholder="Viagem para o Chile" />}
          </Field>

          <Field label="Quanto custa?" required hint="Pode digitar 10000 ou 10.000,00.">
            {(id) => <Input id={id} name="target" required inputMode="decimal" placeholder="10.000" />}
          </Field>

          <Field label="Para quando?" hint="Sem data, a calculadora de parcela não aparece.">
            {(id) => <Input id={id} name="target_date" type="date" />}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              {(id) => (
                <Select id={id} name="category" defaultValue="viagem">
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Emoji">
              {(id) => <Input id={id} name="emoji" maxLength={4} placeholder="🏔️" />}
            </Field>
          </div>

          <Field label="Detalhes">
            {(id) => <Textarea id={id} name="description" className="min-h-[5rem]" />}
          </Field>

          <Button type="submit" size="lg" className="w-full" loading={pending}>
            Criar meta
          </Button>
        </form>
      </Modal>
    </div>
  )
}
