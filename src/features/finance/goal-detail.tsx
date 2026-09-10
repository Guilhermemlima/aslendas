'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select } from '@/components/ui/field'
import { Badge, Progress } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { addContribution, deleteContribution } from '@/app/actions/finance'
import {
  IDEIAS_DE_ECONOMIA,
  dataEstimada,
  formatarBRL,
  lerValorEmCentavos,
  mesesParaAlcancar,
  planejarMeta,
} from '@/lib/finance'
import { formatShortDate } from '@/lib/date'
import { cn } from '@/lib/utils'

export interface GoalView {
  id: string
  title: string
  description: string | null
  emoji: string | null
  category: string
  targetCents: number
  targetDate: string | null
  status: 'ativa' | 'concluida' | 'pausada'
  savedCents: number
  firstContributionOn: string | null
}

export interface ContributionView {
  id: string
  amountCents: number
  contributedOn: string
  note: string | null
}

export function GoalDetail({
  goal,
  contributions,
}: {
  goal: GoalView
  contributions: ContributionView[]
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()

  const plano = useMemo(
    () =>
      planejarMeta({
        alvoCents: goal.targetCents,
        guardadoCents: goal.savedCents,
        dataAlvo: goal.targetDate,
        primeiroAporte: goal.firstContributionOn,
      }),
    [goal],
  )

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------- resumo ---- */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-gold" />
        <CardBody className="space-y-4 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-3xl text-ink">{formatarBRL(goal.savedCents)}</p>
            <p className="text-sm text-ink-soft">de {formatarBRL(goal.targetCents)}</p>
          </div>

          <Progress value={plano.progresso} />

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone={plano.concluida ? 'gold' : 'rose'}>
              {Math.round(plano.progresso * 100)}% guardado
            </Badge>
            {!plano.concluida && <Badge tone="neutral">faltam {formatarBRL(plano.faltaCents)}</Badge>}
            {plano.atrasada && <Badge tone="lilac">a data já passou</Badge>}
            {plano.concluida && <Badge tone="gold">🎉 meta batida</Badge>}
          </div>
        </CardBody>
      </Card>

      {/* --------------------------------------------------- calculadora --- */}
      {!plano.concluida && plano.porMesCents !== null && (
        <Card>
          <CardBody className="space-y-4 p-5">
            <div>
              <p className="label mb-1">Para chegar na data</p>
              <p className="text-sm text-ink-soft">
                Faltam {plano.diasRestantes} dias — cerca de {plano.mesesRestantes}{' '}
                {plano.mesesRestantes === 1 ? 'mês' : 'meses'}.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Parcela rotulo="por mês" valor={plano.porMesCents} destaque />
              <Parcela rotulo="por semana" valor={plano.porSemanaCents} />
              <Parcela rotulo="por dia" valor={plano.porDiaCents} />
            </div>

            <p className="text-xs text-ink-faint">
              Dividindo o que falta pelo tempo que resta. Sem juros nem rendimento no cálculo — é
              quanto vocês precisam separar.
            </p>

            {plano.ritmoMensalCents !== null && (
              <div className="rounded-2xl bg-rose-50/70 px-4 py-3">
                <p className="text-sm text-ink">
                  No ritmo atual de{' '}
                  <strong>{formatarBRL(plano.ritmoMensalCents)} por mês</strong>, a meta fecha em{' '}
                  <strong>{plano.mesesNoRitmoAtual} meses</strong>.
                </p>
                {plano.mesesRestantes !== null && plano.mesesNoRitmoAtual !== null && (
                  <p className="mt-1 text-xs text-ink-soft">
                    {plano.mesesNoRitmoAtual <= plano.mesesRestantes
                      ? 'Está no caminho para chegar na data combinada.'
                      : `Nesse ritmo, chegaria ${plano.mesesNoRitmoAtual - plano.mesesRestantes} meses depois da data.`}
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <SimuladorDeEconomia faltaCents={plano.faltaCents} alvoMensalCents={plano.porMesCents} />

      {/* ------------------------------------------------------- aportes --- */}
      <Card>
        <CardBody className="space-y-4 p-5">
          <p className="label">Registrar movimento</p>

          <form
            className="space-y-3"
            action={(formData) => {
              startTransition(async () => {
                const resultado = await addContribution({
                  goalId: goal.id,
                  amountRaw: String(formData.get('valor') ?? ''),
                  tipo: (formData.get('tipo') as 'aporte') ?? 'aporte',
                  contributedOn: String(formData.get('data') ?? ''),
                  note: String(formData.get('nota') ?? ''),
                })
                if (resultado.ok) {
                  notify('Registrado.')
                  router.refresh()
                } else {
                  notify(resultado.error ?? 'Não consegui salvar.', 'error')
                }
              })
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Valor" required>
                {(id) => <Input id={id} name="valor" required inputMode="decimal" placeholder="500,00" />}
              </Field>
              <Field label="Tipo">
                {(id) => (
                  <Select id={id} name="tipo" defaultValue="aporte">
                    <option value="aporte">Guardar</option>
                    <option value="retirada">Retirar</option>
                  </Select>
                )}
              </Field>
              <Field label="Data">
                {(id) => (
                  <Input
                    id={id}
                    name="data"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                )}
              </Field>
            </div>
            <Field label="Observação">
              {(id) => <Input id={id} name="nota" placeholder="Sobra do mês" maxLength={300} />}
            </Field>
            <Button type="submit" loading={pending}>
              <Plus className="h-4 w-4" /> Registrar
            </Button>
          </form>

          {contributions.length > 0 && (
            <div className="divide-y divide-line/60 border-t border-line/60 pt-2">
              {contributions.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      c.amountCents >= 0 ? 'bg-rose-100 text-rose-700' : 'bg-line/60 text-ink-soft',
                    )}
                  >
                    {c.amountCents >= 0 ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {formatarBRL(Math.abs(c.amountCents))}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {formatShortDate(`${c.contributedOn}T12:00:00`)}
                      {c.note ? ` · ${c.note}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remover movimento"
                    onClick={() =>
                      startTransition(async () => {
                        await deleteContribution(c.id)
                        router.refresh()
                      })
                    }
                    className="focus-ring rounded-full p-2 text-ink-faint hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function Parcela({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string
  valor: number | null
  destaque?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl px-3 py-3 text-center',
        destaque ? 'bg-rose-500 text-white' : 'bg-rose-50 text-ink',
      )}
    >
      <p className={cn('font-display text-lg leading-tight', destaque && 'text-white')}>
        {valor === null ? '—' : formatarBRL(valor)}
      </p>
      <p className={cn('label mt-0.5', destaque && 'text-white/80')}>{rotulo}</p>
    </div>
  )
}

/**
 * Simulador: a pessoa marca ideias de economia e ajusta os valores para a
 * própria realidade. O total é comparado com a parcela que a meta pede.
 *
 * Fica só na tela — nada disso é gravado, porque são estimativas para pensar
 * junto, não um orçamento de verdade.
 */
function SimuladorDeEconomia({
  faltaCents,
  alvoMensalCents,
}: {
  faltaCents: number
  alvoMensalCents: number | null
}) {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const [valores, setValores] = useState<Record<string, number>>(() =>
    Object.fromEntries(IDEIAS_DE_ECONOMIA.map((i) => [i.id, i.sugestaoCents])),
  )

  const total = useMemo(
    () => [...marcadas].reduce((soma, id) => soma + (valores[id] ?? 0), 0),
    [marcadas, valores],
  )

  const mesesNesseRitmo = total > 0 ? mesesParaAlcancar(faltaCents, total) : null
  const quando = total > 0 ? dataEstimada(faltaCents, total) : null

  return (
    <Card>
      <CardBody className="space-y-4 p-5">
        <div>
          <p className="label mb-1">De onde pode sair esse dinheiro</p>
          <p className="text-sm text-ink-soft">
            Marque o que faz sentido para vocês e ajuste os valores. São ideias para conversar, não
            uma conta fechada.
          </p>
        </div>

        <div className="space-y-2">
          {IDEIAS_DE_ECONOMIA.map((ideia) => {
            const marcada = marcadas.has(ideia.id)
            return (
              <div
                key={ideia.id}
                className={cn(
                  'rounded-2xl border p-3 transition-colors',
                  marcada ? 'border-rose-300 bg-rose-50/70' : 'border-line',
                )}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={(e) =>
                      setMarcadas((atual) => {
                        const proxima = new Set(atual)
                        if (e.target.checked) proxima.add(ideia.id)
                        else proxima.delete(ideia.id)
                        return proxima
                      })
                    }
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">
                      <span className="font-emoji">{ideia.emoji}</span> {ideia.titulo}
                    </span>
                    <span className="block text-xs text-ink-soft">{ideia.detalhe}</span>
                  </span>
                </label>

                {marcada && (
                  <div className="mt-2 flex items-center gap-2 pl-7">
                    <span className="text-xs text-ink-faint">por mês</span>
                    <Input
                      inputMode="decimal"
                      defaultValue={(valores[ideia.id] / 100).toFixed(2).replace('.', ',')}
                      onChange={(e) => {
                        const cents = lerValorEmCentavos(e.target.value)
                        setValores((atual) => ({ ...atual, [ideia.id]: cents ?? 0 }))
                      }}
                      className="h-9 w-32 py-1 text-sm"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="rounded-2xl bg-gradient-romance px-4 py-4">
          <p className="label mb-1">Somando o que vocês marcaram</p>
          <p className="font-display text-2xl text-ink">{formatarBRL(total)} por mês</p>

          {alvoMensalCents !== null && total > 0 && (
            <p className="mt-1 text-sm text-ink-soft">
              {total >= alvoMensalCents
                ? `Já cobre a parcela de ${formatarBRL(alvoMensalCents)} — e ainda sobra ${formatarBRL(total - alvoMensalCents)}.`
                : `Faltariam ${formatarBRL(alvoMensalCents - total)} por mês para bater a parcela.`}
            </p>
          )}

          {mesesNesseRitmo !== null && quando && (
            <p className="mt-1 text-xs text-ink-faint">
              Só com isso, a meta fecharia em {mesesNesseRitmo}{' '}
              {mesesNesseRitmo === 1 ? 'mês' : 'meses'} — por volta de{' '}
              {quando.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
