'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { saveIntimateEntry, toggleIntimateDay } from '@/app/actions/intimate'
import { formatDate } from '@/lib/date'
import { cn } from '@/lib/utils'

export interface LogEntry {
  date: string
  vezes: number
  note: string | null
  mood: string | null
}

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const SEMANA_LONGA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const HUMORES = ['', '🔥', '💞', '😴', '😂', '🥰', '✨']

/** Converte Date para 'yyyy-mm-dd' no fuso local (não em UTC). */
function chave(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(
    data.getDate(),
  ).padStart(2, '0')}`
}

export function IntimateLog({ entries }: { entries: LogEntry[] }) {
  const router = useRouter()
  const { notify } = useToast()
  const [pending, startTransition] = useTransition()
  const [cursor, setCursor] = useState(() => new Date())
  const [detalhe, setDetalhe] = useState<string | null>(null)

  const porData = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries])
  const hoje = chave(new Date())

  const stats = useMemo(() => calcularEstatisticas(entries), [entries])

  const primeiroDiaSemana = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()
  const diasNoMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()

  function alternar(data: string) {
    startTransition(async () => {
      const resultado = await toggleIntimateDay(data)
      if (!resultado.ok) {
        notify(resultado.error ?? 'Não consegui salvar.', 'error')
        return
      }
      router.refresh()
    })
  }

  const entradaDetalhe = detalhe ? porData.get(detalhe) : undefined

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------ estatísticas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metrica rotulo="Neste mês" valor={String(stats.noMesAtual)} />
        <Metrica rotulo="Últimos 30 dias" valor={String(stats.ultimos30)} />
        <Metrica
          rotulo="Desde o último"
          valor={stats.diasDesdeUltimo === null ? '—' : `${stats.diasDesdeUltimo}d`}
        />
        <Metrica rotulo="Média semanal" valor={stats.mediaSemanal.toFixed(1)} />
        <Metrica rotulo="Dia mais comum" valor={stats.diaMaisComum ?? '—'} />
        <Metrica rotulo="Total no ano" valor={String(stats.noAno)} />
      </div>

      {/* ---------------------------------------------------------- calendário */}
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
              {MESES[cursor.getMonth()]} de {cursor.getFullYear()}
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
            {SEMANA.map((dia, i) => (
              <span key={i} className="label py-1">
                {dia}
              </span>
            ))}

            {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
              <span key={`vazio-${i}`} />
            ))}

            {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((dia) => {
              const data = chave(new Date(cursor.getFullYear(), cursor.getMonth(), dia))
              const entrada = porData.get(data)
              const futuro = data > hoje
              const ehHoje = data === hoje

              return (
                <button
                  key={dia}
                  type="button"
                  disabled={futuro || pending}
                  onClick={() => (entrada ? setDetalhe(data) : alternar(data))}
                  className={cn(
                    'focus-ring relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors',
                    futuro && 'cursor-not-allowed text-ink-faint/40',
                    !futuro && !entrada && 'text-ink hover:bg-rose-50',
                    entrada && 'bg-rose-500 font-medium text-white hover:bg-rose-700',
                    ehHoje && !entrada && 'ring-1 ring-rose-300',
                  )}
                >
                  <span>{dia}</span>
                  {entrada && (
                    <span className="text-[0.6rem] leading-none">
                      {entrada.mood || (entrada.vezes > 1 ? `×${entrada.vezes}` : '♥')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-center text-xs text-ink-faint">
            Toque num dia para marcar. Toque de novo num dia marcado para editar ou desmarcar.
          </p>
        </CardBody>
      </Card>

      <p className="px-1 text-xs leading-relaxed text-ink-faint">
        Este registro é compartilhado: as duas pessoas do casal veem e podem apagar qualquer dia.
        Ele não aparece no calendário comum, na Home, nas notificações nem na exportação de backup.
      </p>

      {/* ------------------------------------------------------------ detalhe */}
      <Modal
        open={Boolean(detalhe)}
        onClose={() => setDetalhe(null)}
        title={detalhe ? formatDate(`${detalhe}T12:00:00`) : undefined}
        size="sm"
      >
        {detalhe && (
          <form
            className="space-y-4"
            action={(formData) => {
              startTransition(async () => {
                const resultado = await saveIntimateEntry({
                  date: detalhe,
                  vezes: Number(formData.get('vezes') ?? 1),
                  note: String(formData.get('note') ?? ''),
                  mood: String(formData.get('mood') ?? ''),
                })
                if (resultado.ok) {
                  notify('Registro atualizado.')
                  setDetalhe(null)
                  router.refresh()
                } else {
                  notify(resultado.error ?? 'Não consegui salvar.', 'error')
                }
              })
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vezes">
                {(id) => (
                  <Input
                    id={id}
                    name="vezes"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={entradaDetalhe?.vezes ?? 1}
                  />
                )}
              </Field>
              <Field label="Humor">
                {(id) => (
                  <Select id={id} name="mood" defaultValue={entradaDetalhe?.mood ?? ''}>
                    {HUMORES.map((emoji) => (
                      <option key={emoji || 'nenhum'} value={emoji}>
                        {emoji || 'Nenhum'}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            <Field label="Anotação" hint="Opcional. Fica só aqui dentro.">
              {(id) => (
                <Textarea
                  id={id}
                  name="note"
                  className="min-h-[5rem]"
                  defaultValue={entradaDetalhe?.note ?? ''}
                />
              )}
            </Field>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" loading={pending}>
                Salvar
              </Button>
              <Button
                type="button"
                variant="ghost"
                loading={pending}
                onClick={() => {
                  alternar(detalhe)
                  setDetalhe(null)
                }}
              >
                <Trash2 className="h-4 w-4" /> Desmarcar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Card>
      <CardBody className="p-4">
        <p className="label mb-1">{rotulo}</p>
        <p className="font-display text-2xl text-ink">{valor}</p>
      </CardBody>
    </Card>
  )
}

/**
 * Estatísticas no estilo dos apps de ciclo: contagens recentes, intervalo desde
 * o último registro, média e o dia da semana que mais aparece.
 * `vezes` entra na soma — dois no mesmo dia contam dois.
 */
function calcularEstatisticas(entries: LogEntry[]) {
  const hoje = new Date()
  const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const comoData = (valor: string) => new Date(`${valor}T12:00:00`)

  const diasAtras = (valor: string) =>
    Math.round((inicioDoDia(hoje).getTime() - inicioDoDia(comoData(valor)).getTime()) / 86_400_000)

  const somar = (lista: LogEntry[]) => lista.reduce((total, e) => total + e.vezes, 0)

  const noMesAtual = somar(
    entries.filter((e) => {
      const d = comoData(e.date)
      return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth()
    }),
  )

  const noAno = somar(
    entries.filter((e) => comoData(e.date).getFullYear() === hoje.getFullYear()),
  )

  const ultimos30 = somar(entries.filter((e) => diasAtras(e.date) <= 30))
  const ultimos90 = somar(entries.filter((e) => diasAtras(e.date) <= 90))

  const maisRecente = entries
    .map((e) => e.date)
    .sort()
    .at(-1)

  const contagemPorDiaDaSemana = new Array(7).fill(0) as number[]
  for (const e of entries) contagemPorDiaDaSemana[comoData(e.date).getDay()] += e.vezes

  const maiorContagem = Math.max(...contagemPorDiaDaSemana)

  return {
    noMesAtual,
    noAno,
    ultimos30,
    mediaSemanal: ultimos90 / (90 / 7),
    diasDesdeUltimo: maisRecente ? diasAtras(maisRecente) : null,
    diaMaisComum:
      maiorContagem > 0 ? SEMANA_LONGA[contagemPorDiaDaSemana.indexOf(maiorContagem)] : null,
  }
}
